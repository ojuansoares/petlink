import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { OptionSelect } from '../components/ui/OptionSelect'
import { Heading, Text } from '../components/ui/Typography'
import { BRAZIL_STATES } from '../constants/brazilStates'
import { useTheme } from '../hooks/useTheme'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { showToast } from '../store/slices/uiSlice'
import { registerThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'

type Props = StackScreenProps<AuthStackParamList, 'Register'>

function calcAgeFromISO(isoDate: string): number | null {
  if (!isoDate) return null
  const birth = new Date(isoDate)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? age - 1 : age
}

function parseDisplayDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null
  const [day, month, year] = value.split('/').map(Number)
  if (!day || !month || !year) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function dateToIso(value: string) {
  const [day, month, year] = value.split('/')
  return `${year}-${month}-${day}`
}

export default function RegisterScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)

  React.useEffect(() => {
    if (authError) {
      dispatch(showToast({ type: 'error', message: authError }))
    }
  }, [authError])

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = React.useState(false)

  const logoOpacity = React.useRef(new Animated.Value(0)).current
  const logoTranslateY = React.useRef(new Animated.Value(-20)).current
  const panelTranslateY = React.useRef(new Animated.Value(48)).current
  const panelOpacity = React.useRef(new Animated.Value(0)).current

  const successMessage = 'Cadastro criado. Confira seu email e confirme a conta antes de fazer login.'

  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  let missingPasswordRule: string | null = null
  if (!hasMinLength) {
    missingPasswordRule = 'Falta: pelo menos 8 caracteres.'
  } else if (!hasUppercase) {
    missingPasswordRule = 'Falta: 1 letra maiuscula.'
  } else if (!hasNumber) {
    missingPasswordRule = 'Falta: 1 numero.'
  } else if (!hasSpecialChar) {
    missingPasswordRule = 'Falta: 1 caractere especial.'
  }

  const hasStrongPassword = !missingPasswordRule
  const isConfirmFilled = confirmPassword.length > 0
  const passwordMatches = password === confirmPassword

  let passwordValidationMessage: string | null = missingPasswordRule
  if (!passwordValidationMessage && password.length > 0 && !isConfirmFilled) {
    passwordValidationMessage = 'Falta: confirmar a senha.'
  }
  if (!passwordValidationMessage && isConfirmFilled && !passwordMatches) {
    passwordValidationMessage = 'As senhas nao conferem.'
  }

  const birthDateObj = parseDisplayDate(birthDate)
  const age = birthDateObj ? calcAgeFromISO(birthDateObj.toISOString().split('T')[0]) : null
  const birthDateValid = birthDateObj !== null && age !== null && age >= 13
  const birthDateError = birthDate.length === 10 && !birthDateValid
    ? (age !== null && age < 13)
      ? `Voce precisa ter pelo menos 13 anos (voce tem ${age}).`
      : 'Data invalida.'
    : null

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    location.trim().length > 0 &&
    birthDateValid &&
    hasStrongPassword &&
    isConfirmFilled &&
    passwordMatches &&
    !isLoading &&
    !showSuccessOverlay

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
        duration: 390,
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

  React.useEffect(() => {
    if (!showSuccessOverlay) return

    const timer = setTimeout(() => {
      setShowSuccessOverlay(false)
      navigation.replace('Login')
    }, 1200)

    return () => clearTimeout(timer)
  }, [navigation, showSuccessOverlay])

  const handleRegister = async () => {
    if (!canSubmit) return

    const result = await dispatch(
      registerThunk({
        name: name.trim(),
        email: email.trim(),
        location,
        password,
        birthDate: dateToIso(birthDate),
      })
    )

    if (registerThunk.fulfilled.match(result)) {
      setShowSuccessOverlay(true)
    }
  }

  const handleBirthDateChange = (text: string) => {
    const clean = text.replace(/\D/g, '')
    let formatted = clean

    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`
    }
    if (clean.length > 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`
    }

    if (formatted.length <= 10) {
      setBirthDate(formatted)
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
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Card variant="organic" style={styles.card}>
              <Pressable
                style={styles.inlineBackButton}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'))}
              >
                <Ionicons name="arrow-back" size={16} color={colors.foreground} />
                <Text size="sm" weight="700">Voltar</Text>
              </Pressable>

              <Heading size="3xl" weight="800" style={styles.title}>Registro</Heading>
              <Text size="sm" color="mutedForeground" style={styles.subtitle}>Crie sua conta para comecar a acompanhar seus pets.</Text>

              <Input
                placeholder="Nome"
                value={name}
                onChangeText={setName}
                leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />}
              />

              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />}
              />

              <OptionSelect
                placeholder="Estado"
                value={location}
                onChange={setLocation}
                options={BRAZIL_STATES}
                leftIconName="location-outline"
              />

              <Input
                placeholder="Data de nascimento"
                value={birthDate}
                onChangeText={handleBirthDateChange}
                keyboardType="numeric"
                maxLength={10}
                leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />}
              />

              {birthDateError ? (
                <Text size="xs" style={[styles.hint, { color: colors.destructive }]}>
                  {birthDateError}
                </Text>
              ) : null}

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

              <Input
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.mutedForeground} />}
                rightIcon={(
                  <Pressable
                    onPress={() => setShowConfirmPassword((value) => !value)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Ocultar confirmacao de senha' : 'Mostrar confirmacao de senha'}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                )}
              />

              {password.length > 0 && passwordValidationMessage ? (
                <Text size="xs" color="mutedForeground" style={styles.hint}>{passwordValidationMessage}</Text>
              ) : null}

              <Button
                label={isLoading ? 'Registrando...' : 'Registrar'}
                onPress={handleRegister}
                disabled={!canSubmit}
                loading={isLoading}
                style={styles.buttonSpacing}
              />

              <View style={styles.loginRow}>
                <Text size="sm" color="mutedForeground">Ja tem uma conta? </Text>
                <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'))}>
                  <Text size="sm" weight="700" color="secondary">Faca log-in</Text>
                </Pressable>
              </View>
            </Card>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal visible={showSuccessOverlay} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayBackdrop}>
          <Card variant="organic" style={[styles.overlayCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator color={colors.primary} />
            <Heading size="xl" weight="800">Cadastro realizado</Heading>
            <Text size="sm" style={styles.overlayMessage}>{successMessage}</Text>
            <Text size="sm" weight="700" color="secondary">Redirecionando para o login...</Text>
          </Card>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#5D7052',
  },
  brandArea: {
    flex: 0.62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  logo: {
    width: 188,
    height: 188,
  },
  keyboardContainer: {
    flex: 1.38,
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
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'flex-end',
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
  inlineBackButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
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
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 360,
    padding: 18,
    gap: 10,
    alignItems: 'center',
  },
  overlayMessage: {
    textAlign: 'center',
  },
})
