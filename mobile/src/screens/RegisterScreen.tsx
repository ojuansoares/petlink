import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'
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
  const [password, setPassword] = React.useState('')
  const [showSuccessOverlay, setShowSuccessOverlay] = React.useState(false)

  const successMessage = 'Cadastro criado. Confira seu email e confirme a conta antes de fazer login.'

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
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
        password,
      })
    )

    if (registerThunk.fulfilled.match(result)) {
      setShowSuccessOverlay(true)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
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

        <Input
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
        />

      {password.length > 0 && password.length < 8 ? (
          <Text size="xs" color="mutedForeground" style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  card: {
    width: '100%',
    gap: 12,
  },
  backTopButton: {
    position: 'absolute',
    top: 56,
    left: 16,
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
