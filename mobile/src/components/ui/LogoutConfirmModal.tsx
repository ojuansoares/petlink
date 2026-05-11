import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { AppToast } from './AppToast'
import { Button } from './Button'
import { Heading, Text } from './Typography'

interface LogoutConfirmModalProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function LogoutConfirmModal({ visible, onCancel, onConfirm }: Readonly<LogoutConfirmModalProps>) {
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <AppToast />
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={styles.body}>
            <Heading size="lg" weight="800">Tem certeza que deseja deslogar?</Heading>
            <Text color="mutedForeground">Voce pode entrar novamente quando quiser.</Text>

            <View style={styles.actions}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={onCancel}
                style={styles.actionButton}
              />
              <Button
                label="Deslogar"
                onPress={onConfirm}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
})