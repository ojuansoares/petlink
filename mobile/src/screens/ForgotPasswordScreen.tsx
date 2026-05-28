import React from 'react'
import { View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Animated, Easing, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StackScreenProps } from '@react-navigation/stack'
import { AuthStackParamList } from '../navigation/types'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { forgotPasswordThunk, selectAuthLoading, selectAuthError } from '../store/slices/authSlice'
import { showToast } from '../store/slices/uiSlice'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>

export default function ForgotPasswordScreen({ navigation }: Readonly<Props>) {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)

  const [email, setEmail] = React.useState('')

  const logoOpacity = React.useRef(new Animated.Value(0)).current
  const logoTranslateY = React.useRef(new Animated.Value(-20)).current
  const panelTranslateY = React.useRef(new Animated.Value(46)).current
  const panelOpacity = React.useRef(new Animated.Value(0)).current

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

  React.useEffect(() => {
    if (authError) {
      dispatch(showToast({ type: 'error', message: authError }))
    }
  }, [authError])

  const handleSend = async () => {
    if (!email.trim()) return
    try {
      await dispatch(forgotPasswordThunk(email.trim())).unwrap()
      dispatch(showToast({ type: 'success', title: 'Recuperação', message: 'Email de recuperação enviado! Verifique sua caixa de entrada.' }))
      navigation.goBack()
    } catch {
      // erro tratado pelo toast do effect acima
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
              <View style={styles.backRow}>
                <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <Heading size="3xl" weight="800" style={styles.title}>Esqueceu a senha?</Heading>
              <Text size="sm" color="mutedForeground" style={styles.subtitle}>
                Digite seu email cadastrado e enviaremos um link para redefinir sua senha.
              </Text>

              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="Seu email"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />}
              />

              <Button
                label={isLoading ? 'Enviando...' : 'Enviar link'}
                onPress={handleSend}
                disabled={!email.trim() || isLoading}
                loading={isLoading}
                style={styles.buttonSpacing}
              />
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
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
    paddingTop: 8,
    paddingBottom: 24,
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
  backRow: {
    flexDirection: 'row',
    marginBottom: 4,
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
})
