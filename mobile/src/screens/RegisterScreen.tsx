import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
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
import { registerThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'

type Props = StackScreenProps<AuthStackParamList, 'Register'>

export default function RegisterScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showSuccessOverlay, setShowSuccessOverlay] = React.useState(false)

  const successMessage = 'Cadastro criado. Confira seu email e confirme a conta antes de fazer login.'

  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  let missingPasswordRule: string | null = null
  if (hasMinLength === false) {
    missingPasswordRule = 'Falta: pelo menos 8 caracteres.'
  } else if (hasUppercase === false) {
    missingPasswordRule = 'Falta: 1 letra maiuscula.'
  } else if (hasNumber === false) {
    missingPasswordRule = 'Falta: 1 numero.'
  } else if (hasSpecialChar === false) {
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

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    location.trim().length > 0 &&
    hasStrongPassword &&
    isConfirmFilled &&
    passwordMatches &&
    !isLoading &&
    !showSuccessOverlay

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
      })
    )

    if (registerThunk.fulfilled.match(result)) {
      setShowSuccessOverlay(true)
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Card variant="organic" style={styles.card}>
            <Heading size="3xl" weight="800">Registro</Heading>
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
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
            />

            <Input
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.mutedForeground} />}
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

            {authError ? <Text style={{ color: colors.destructive }}>{authError}</Text> : null}

            <View style={styles.loginRow}>
              <Text size="sm" color="mutedForeground">Ja tem uma conta? </Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text size="sm" weight="700" color="secondary">Faca log-in</Text>
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Pressable
        style={[
          styles.backTopButton,
          { backgroundColor: withAlpha(colors.card, 0.85), borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate('Login')}
      >
        <Ionicons name="arrow-back" size={16} color={colors.foreground} />
        <Text size="sm" weight="700">Voltar</Text>
      </Pressable>

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
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    gap: 12,
  },
  backTopButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 20,
    elevation: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
