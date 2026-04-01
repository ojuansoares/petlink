import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { API_BASE_URL } from '../api/axios'
import { useTheme } from '../hooks/useTheme'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { loginThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'
import { selectIsDark, toggleTheme } from '../store/slices/uiSlice'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'

type Props = StackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)
  const isDark = useAppSelector(selectIsDark)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const hasMinPassword = password.length >= 8
  const canSubmit = email.trim().length > 0 && hasMinPassword
  const isSubmitDisabled = !canSubmit || isLoading

  const handleLogin = () => {
    if (!canSubmit) return
    console.log(`[LOGIN] tentando login em ${API_BASE_URL}/auth/login`)
    dispatch(loginThunk({ email: email.trim(), password }))
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Pressable
        style={[
          styles.themeSwitch,
          { backgroundColor: withAlpha(colors.card, 0.85), borderColor: colors.border },
        ]}
        onPress={() => dispatch(toggleTheme())}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.foreground} />
      </Pressable>

      <Card variant="organic" style={styles.card}>
        <Heading size="3xl" weight="800">Login</Heading>
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
        secureTextEntry
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
        />

      {!hasMinPassword && password.length > 0 ? (
          <Text size="xs" color="mutedForeground" style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text>
      ) : null}

        <Button
          label={isLoading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          disabled={isSubmitDisabled}
          loading={isLoading}
          style={styles.buttonSpacing}
        />

        {authError ? <Text style={{ color: colors.destructive }}>{authError}</Text> : null}

        <View style={styles.registerRow}>
          <Text size="sm" color="mutedForeground">Nao tem uma conta? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text size="sm" weight="700" color="secondary">Registre-se</Text>
          </Pressable>
        </View>

        <Text size="xs" color="mutedForeground">API: {API_BASE_URL}</Text>
      </Card>
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
  themeSwitch: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
})
