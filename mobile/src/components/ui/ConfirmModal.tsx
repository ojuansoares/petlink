import React from 'react'
import { Modal, View, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text, Heading } from './Typography'

interface ConfirmModalProps {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors, withAlpha } = useTheme()

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade">
      <Pressable style={[styles.overlay, { backgroundColor: withAlpha('#000', 0.5) }]} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.card, { backgroundColor: colors.background }]}
        >
          <Heading size="sm" weight="800">{title}</Heading>
          <Text size="sm" color="mutedForeground" style={{ marginTop: 8 }}>{message}</Text>
          <View style={styles.actions}>
            {cancelLabel ? (
              <Pressable
                onPress={onCancel}
                style={[styles.btn, { borderColor: colors.border }]}
              >
                <Text size="sm" weight="600" color="mutedForeground">{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onConfirm}
              style={[styles.btn, { backgroundColor: destructive ? colors.destructive : colors.primary }]}
            >
              <Text size="sm" weight="600" style={{ color: '#fff' }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
})
