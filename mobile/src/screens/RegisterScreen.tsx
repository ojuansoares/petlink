import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { registerThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'

type Props = StackScreenProps<AuthStackParamList, 'Register'>

export default function RegisterScreen({ navigation }: Readonly<Props>) {
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !isLoading

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
      setSuccessMessage('Conta criada com sucesso. Faça login para entrar.')
      navigation.navigate('Login')
    }
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backTopButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backTopButtonText}>← Voltar</Text>
      </Pressable>

      <Text style={styles.title}>Registro</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={name}
        onChangeText={setName}
      />

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

      {password.length > 0 && password.length < 8 ? (
        <Text style={styles.hint}>A senha precisa ter pelo menos 8 caracteres.</Text>
      ) : null}

      <Pressable
        onPress={handleRegister}
        disabled={!canSubmit}
        style={({ pressed }) => [
          styles.submitButton,
          canSubmit ? styles.submitButtonEnabled : styles.submitButtonDisabled,
          pressed && canSubmit ? styles.submitButtonPressed : null,
        ]}
      >
        <Text style={styles.submitButtonText}>{isLoading ? 'Registrando...' : 'Registrar'}</Text>
      </Pressable>

      {authError ? <Text style={styles.error}>{authError}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Ja tem uma conta? </Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Faca log-in</Text>
        </Pressable>
      </View>
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
  backTopButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  backTopButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
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
  hint: {
    color: '#374151',
    fontSize: 12,
    alignSelf: 'flex-start',
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
  error: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  success: {
    color: '#166534',
    textAlign: 'center',
    fontSize: 13,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loginText: {
    color: '#374151',
    fontSize: 14,
  },
  loginLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
})
