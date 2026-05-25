import React from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import {
  Animated,
  Alert,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { API_BASE_URL } from '../api/axios'
import {
  authenticateBiometric,
  canOfferBiometricLogin,
  canUseBiometricLogin,
  hasStoredAuthSession,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  setBiometricSessionLocked,
} from '../services/BiometricService'
import { useTheme } from '../hooks/useTheme'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { showToast } from '../store/slices/uiSlice'
import {
  hydrateAuthThunk,
  loginThunk,
  refreshTokenThunk,
  selectAuthError,
  selectAuthLoading,
} from '../store/slices/authSlice'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'

type Props = StackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)

  React.useEffect(() => {
    if (authError) {
      dispatch(showToast({ type: 'error', message: authError }))
    }
  }, [authError])

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [canUseBiometric, setCanUseBiometric] = React.useState(false)
  const [showBiometricOption, setShowBiometricOption] = React.useState(false)
  const [isBiometricLoading, setIsBiometricLoading] = React.useState(false)
  const logoOpacity = React.useRef(new Animated.Value(0)).current
  const logoTranslateY = React.useRef(new Animated.Value(-20)).current
  const panelTranslateY = React.useRef(new Animated.Value(46)).current
  const panelOpacity = React.useRef(new Animated.Value(0)).current

  const hasMinPassword = password.length >= 8
  const canSubmit = email.trim().length > 0 && hasMinPassword
  const isSubmitDisabled = !canSubmit || isLoading
  const biometricButtonLabel = isBiometricLoading
    ? 'Validando...'
    : canUseBiometric
      ? 'Entrar com biometria'
      : 'Ativar biometria'

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true

      const loadBiometricState = async () => {
        const [canUse, canOffer] = await Promise.all([
          canUseBiometricLogin(),
          canOfferBiometricLogin(),
        ])

        if (mounted) {
          setCanUseBiometric(canUse)
          setShowBiometricOption(canOffer)
        }
      }

      loadBiometricState()

      return () => {
        mounted = false
      }
    }, [])
  )

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelTranslateY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [logoOpacity, logoTranslateY, panelOpacity, panelTranslateY])

  const handleLogin = async () => {
    if (!canSubmit) return
    console.log(`[LOGIN] tentando login em ${API_BASE_URL}/auth/login`)

    try {
      await dispatch(loginThunk({ email: email.trim(), password })).unwrap()
      await setBiometricSessionLocked(false)

      const available = await isBiometricAvailable()
      const enabled = await isBiometricEnabled()

      if (!available || enabled) {
        if (enabled) {
          setCanUseBiometric(true)
        }
        return
      }

      Alert.alert(
        'Ativar biometria?',
        'Use biometria para entrar mais rapido neste aparelho.',
        [
          { text: 'Agora nao', style: 'cancel' },
          {
            text: 'Ativar',
            onPress: async () => {
              const confirmed = await authenticateBiometric()
              if (!confirmed) return

              await setBiometricEnabled(true)
              setCanUseBiometric(true)
              setShowBiometricOption(true)
            },
          },
        ]
      )
    } catch {
      // erro ja tratado no estado global de auth
    }
  }

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true)

    try {
      let authenticated = false

      if (!canUseBiometric) {
        const enabled = await isBiometricEnabled()
        if (!enabled) {
          authenticated = await authenticateBiometric()
          if (!authenticated) return

          await setBiometricEnabled(true)
          setCanUseBiometric(true)
        }
      } else {
        authenticated = await authenticateBiometric()
        if (!authenticated) return
      }

      await setBiometricSessionLocked(false)

      const hasSession = await hasStoredAuthSession()
      if (!hasSession) {
        Alert.alert(
          'Sessão não encontrada',
          'Faça login com email e senha novamente para vincular a biometria neste aparelho.'
        )
        return
      }

      try {
        await dispatch(refreshTokenThunk()).unwrap()
      } catch {
      }

      await dispatch(hydrateAuthThunk())
    } finally {
      setIsBiometricLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.brandArea}>
        <Animated.Image
          source={require('../assets/icon.png')}
          resizeMode="contain"
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }],
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Card variant="organic" style={styles.card}>
              <Heading size="3xl" weight="800" style={styles.title}>Login</Heading>
              <Text size="sm" color="mutedForeground" style={styles.subtitle}>Entre para acessar seu espaco no PetLink.</Text>

              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />}
              />

              <Input
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
                rightIcon={(
                  <Pressable
                    onPress={() => setShowPassword((value) => !value)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                )}
              />

              {!hasMinPassword && password.length > 0 ? (
                <Text size="xs" color="mutedForeground" style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text>
              ) : null}

              <View style={styles.forgotRow}>
                <Pressable onPress={() => navigation.push('ForgotPassword')}>
                  <Text size="sm" weight="700" color="secondary">Esqueceu a senha?</Text>
                </Pressable>
              </View>

              <Button
                label={isLoading ? 'Entrando...' : 'Entrar'}
                onPress={handleLogin}
                disabled={isSubmitDisabled}
                loading={isLoading}
                style={styles.buttonSpacing}
              />

              {showBiometricOption ? (
                <Button
                  label={biometricButtonLabel}
                  variant="outline"
                  onPress={handleBiometricLogin}
                  disabled={isLoading || isBiometricLoading}
                  loading={isBiometricLoading}
                />
              ) : null}

              <View style={styles.registerRow}>
                <Text size="sm" color="mutedForeground">Nao tem uma conta? </Text>
                <Pressable onPress={() => navigation.push('Register')}>
                  <Text size="sm" weight="700" color="secondary">Registre-se</Text>
                </Pressable>
              </View>
            </Card>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#5D7052',
  },
  brandArea: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logo: {
    width: 188,
    height: 188,
  },
  keyboardContainer: {
    flex: 1.5,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#F3F4F1',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    justifyContent: 'flex-start',
  },
  card: {
    width: '100%',
    gap: 12,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  title: {
    color: '#5D7052',
  },
  subtitle: {
    marginBottom: 8,
  },
  buttonSpacing: {
    marginTop: 4,
  },
  hint: {
    alignSelf: 'flex-start',
  },
  forgotRow: {
    alignItems: 'flex-end',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
})
