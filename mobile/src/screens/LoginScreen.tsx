import React from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { API_BASE_URL } from '../api/axios'
import { useTheme } from '../hooks/useTheme'
import { AuthStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import { loginThunk, selectAuthError, selectAuthLoading } from '../store/slices/authSlice'
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
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const hasMinPassword = password.length >= 8
  const canSubmit = email.trim().length > 0 && hasMinPassword
  const isSubmitDisabled = !canSubmit || isLoading

  const handleLogin = () => {
    if (!canSubmit) return
    console.log(`[LOGIN] tentando login em ${API_BASE_URL}/auth/login`)
    dispatch(loginThunk({ email: email.trim(), password }))
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
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
