import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api, API_BASE_URL } from '../api/axios'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { loginThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'
import { selectIsDark, toggleTheme } from '../store/slices/uiSlice'

type Props = StackScreenProps<AuthStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)
  const isDark = useAppSelector(selectIsDark)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [healthStatus, setHealthStatus] = React.useState<string | null>(null)

  const hasMinPassword = password.length >= 8
  const canSubmit = email.trim().length > 0 && hasMinPassword
  const isSubmitDisabled = !canSubmit || isLoading

  const handleLogin = () => {
    if (!canSubmit) return
    console.log(`[LOGIN] tentando login em ${API_BASE_URL}/auth/login`)
    dispatch(loginThunk({ email: email.trim(), password }))
  }

  const handleTestApi = async () => {
    try {
      setHealthStatus('Testando conexao...')
      const startedAt = Date.now()
      const { data } = await api.get('/health')
      const duration = Date.now() - startedAt
      setHealthStatus(`API OK (${duration}ms) - ok=${String(data?.ok ?? false)}`)
    } catch (err: any) {
      const message = err?.message ?? 'Falha de rede'
      setHealthStatus(`Falha API: ${message}`)
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.themeSwitch} onPress={() => dispatch(toggleTheme())}>
        <Text style={styles.themeSwitchText}>{isDark ? '☀️' : '🌙'}</Text>
      </Pressable>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
      />
      {!hasMinPassword && password.length > 0 ? (
        <Text style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text>
      ) : null}
      <Pressable
        onPress={handleLogin}
        disabled={isSubmitDisabled}
        style={({ pressed }) => [
          styles.submitButton,
          isSubmitDisabled ? styles.submitButtonDisabled : styles.submitButtonEnabled,
          pressed && !isSubmitDisabled ? styles.submitButtonPressed : null,
        ]}
      >
        <Text style={styles.submitButtonText}>{isLoading ? 'Entrando...' : 'Entrar'}</Text>
      </Pressable>
      {/* <Button title="Testar API" onPress={handleTestApi} /> */}
      {authError ? <Text style={styles.error}>{authError}</Text> : null}
      {healthStatus ? <Text style={styles.status}>{healthStatus}</Text> : null}
      <View style={styles.registerRow}>
        <Text style={styles.registerText}>Nao tem uma conta? </Text>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>Registre-se</Text>
        </Pressable>
      </View>
      <Text style={styles.apiInfo}>API: {API_BASE_URL}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    position: 'relative',
  },
  themeSwitch: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  themeSwitchText: {
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  submitButton: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonEnabled: {
    backgroundColor: '#2563eb',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#374151',
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  error: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  status: {
    color: '#1f2937',
    textAlign: 'center',
    fontSize: 12,
  },
  apiInfo: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  registerText: {
    color: '#374151',
    fontSize: 14,
  },
  registerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
})
