import React from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { api } from '../api/axios'
import { Button } from '../components/ui/Button'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch } from '../store'
import { logout } from '../store/slices/authSlice'
import { showToast } from '../store/slices/uiSlice'
import { setBiometricEnabled, setBiometricSessionLocked } from '../services/BiometricService'
import { clearAuthTokens } from '../utils/authStorage'
import { ProfileOfflineRepository } from '../data/repositories/ProfileOfflineRepository'
import { AppToast } from '../components/ui/AppToast'

export default function SettingsDangerZoneScreen() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false)

  const confirmDeleteAccount = async () => {
    setIsDeletingAccount(true)

    try {
      await api.delete('/profile/me')

      await clearAuthTokens()
      await SecureStore.deleteItemAsync('petlink_cached_user')
      await SecureStore.deleteItemAsync('petlink_cached_profile')
      await ProfileOfflineRepository.clearCache()
      await setBiometricSessionLocked(false)
      await setBiometricEnabled(false)

      dispatch(logout())
      dispatch(showToast({ type: 'success', message: 'Conta excluida com sucesso.' }))
      setShowDeleteConfirm(false)
    } catch {
      dispatch(showToast({ type: 'error', message: 'Nao foi possivel excluir sua conta.' }))
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View
        style={[
          styles.dangerCard,
          {
            backgroundColor: withAlpha(colors.destructive, 0.08),
            borderColor: withAlpha(colors.destructive, 0.45),
          },
        ]}
      >
        <Heading size="xl" weight="800" style={{ color: colors.destructive }}>Zona sensível</Heading>
        <Text color="mutedForeground">
          A exclusao da conta e permanente. Seu perfil, pets e dados relacionados serao removidos.
        </Text>
        <Text size="sm" color="mutedForeground">
          Essa acao nao pode ser desfeita.
        </Text>

        <Button
          label="Excluir conta"
          variant="destructive"
          onPress={() => setShowDeleteConfirm(true)}
          disabled={isDeletingAccount}
        />
      </View>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" statusBarTranslucent>
        <AppToast />
        <View style={styles.overlayBackdrop}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.card,
                borderColor: withAlpha(colors.border, 0.8),
              },
            ]}
          >
            <Heading size="lg" weight="800">Excluir conta permanentemente?</Heading>
            <Text color="mutedForeground">Essa acao remove seu perfil, pets e dados relacionados. Nao pode ser desfeita.</Text>

            <View style={styles.confirmActions}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isDeletingAccount}
                style={styles.confirmActionButton}
              />
              <Button
                label="Excluir"
                variant="destructive"
                onPress={confirmDeleteAccount}
                loading={isDeletingAccount}
                style={styles.confirmActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  dangerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  confirmActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  confirmActionButton: {
    flex: 1,
  },
})
