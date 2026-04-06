import React from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Button } from './Button'
import { Heading, Text } from './Typography'

interface LogoutConfirmModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function LogoutConfirmModal({ visible, onCancel, onConfirm }: Readonly<LogoutConfirmModalProps>) {
  const { colors, withAlpha } = useTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
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
          <Heading size="lg" weight="800">Tem certeza que deseja deslogar?</Heading>
          <Text color="mutedForeground">Voce pode entrar novamente quando quiser.</Text>

          <View style={styles.confirmActions}>
            <Button
              label="Cancelar"
              variant="outline"
              onPress={onCancel}
              style={styles.confirmActionButton}
            />
            <Button
              label="Deslogar"
              onPress={onConfirm}
              style={styles.confirmActionButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
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