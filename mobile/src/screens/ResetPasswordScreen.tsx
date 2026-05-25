import React, { useEffect } from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../navigation/types'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import {
  resetPasswordThunk,
  selectAuthLoading,
  selectAuthError,
  selectIsPasswordResetFlow,
} from '../store/slices/authSlice'
import { showToast } from '../store/slices/uiSlice'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'
import { Pressable } from 'react-native'

export default function ResetPasswordScreen() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const isLoading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)
  const isPasswordResetFlow = useAppSelector(selectIsPasswordResetFlow)

  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  useEffect(() => {
    if (!isPasswordResetFlow) {
      navigation.navigate('Login')
    }
  }, [isPasswordResetFlow, navigation])

  useEffect(() => {
    if (authError) {
      dispatch(showToast({ type: 'error', message: authError }))
    }
  }, [authError])

  const hasMinPassword = password.length >= 8
  const passwordsMatch = password === confirm
  const canSubmit = hasMinPassword && passwordsMatch && !isLoading

  const handleReset = async () => {
    if (!canSubmit) return
    try {
      await dispatch(resetPasswordThunk(password)).unwrap()
      dispatch(showToast({ type: 'success', message: 'Senha redefinida com sucesso! Faça login novamente.' }))
    } catch {
      // erro tratado pelo toast
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>
          <Heading size="2xl" weight="800" style={{ textAlign: 'center' }}>
            Redefinir senha
          </Heading>
          <Text size="sm" color="mutedForeground" style={{ textAlign: 'center', marginBottom: 16 }}>
            Escolha uma nova senha para sua conta.
          </Text>

          <Input
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            placeholder="Nova senha"
            value={password}
            onChangeText={setPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
            rightIcon={
              <Pressable
                onPress={() => setShowPassword(v => !v)}
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
            }
          />

          <Input
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showPassword}
            placeholder="Confirmar nova senha"
            value={confirm}
            onChangeText={setConfirm}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />}
          />

          {!hasMinPassword && password.length > 0 && (
            <Text size="xs" color="mutedForeground">A senha precisa ter pelo menos 8 caracteres.</Text>
          )}
          {hasMinPassword && !passwordsMatch && confirm.length > 0 && (
            <Text size="xs" color="destructive">As senhas não conferem.</Text>
          )}

          <Button
            label={isLoading ? 'Redefinindo...' : 'Redefinir senha'}
            onPress={handleReset}
            disabled={!canSubmit}
            loading={isLoading}
            style={{ marginTop: 8 }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  iconWrapper: {
    alignSelf: 'center',
    marginBottom: 8,
  },
})
