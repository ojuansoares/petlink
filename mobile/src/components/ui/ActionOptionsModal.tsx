import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { Button } from './Button'
import { Heading, Text } from './Typography'

interface ActionOption {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  variant?: 'default' | 'destructive'
}

interface ActionOptionsModalProps {
  visible: boolean
  onClose: () => void
  title: string
  description?: string
  options: ActionOption[]
  confirmDeleteTitle?: string
  confirmDeleteDesc?: string
  onDelete?: () => void
}

export function ActionOptionsModal({ 
  visible, 
  onClose, 
  title, 
  description,
  options, 
  confirmDeleteTitle,
  confirmDeleteDesc,
  onDelete 
}: Readonly<ActionOptionsModalProps>) {
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleClose = () => {
    setShowDeleteConfirm(false)
    onClose()
  }

  // Se estiver na tela de confirmação de exclusão
  if (showDeleteConfirm) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDeleteConfirm(false)} />
          <View style={[styles.confirmSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>
            <View style={styles.confirmBody}>
              <View style={[styles.confirmIcon, { backgroundColor: withAlpha(colors.destructive, 0.1) }]}>
                <Ionicons name="warning" size={32} color={colors.destructive} />
              </View>
              <Heading size="lg" weight="800" style={styles.dialogTitle}>{confirmDeleteTitle || 'Excluir?'}</Heading>
              <Text color="mutedForeground" style={styles.dialogDesc}>
                {confirmDeleteDesc || 'Esta ação não pode ser desfeita e os dados serão removidos.'}
              </Text>
              <View style={styles.dialogActions}>
                <Button label="Cancelar" variant="outline" onPress={() => setShowDeleteConfirm(false)} style={{ flex: 1 }} />
                <Button 
                  label="Excluir" 
                  style={{ flex: 1, backgroundColor: colors.destructive }} 
                  onPress={() => {
                    if (onDelete) onDelete()
                    handleClose()
                  }} 
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHandle}>
            <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={styles.header}>
            <View>
              <Heading size="lg" weight="800">{title}</Heading>
              {description && <Text size="xs" color="mutedForeground">{description}</Text>}
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.optionsList}>
            {options.map((option, index) => {
              const isLast = index === options.length - 1
              const isDestructive = option.variant === 'destructive'

              return (
                <Pressable
                  key={option.label}
                  style={[
                    styles.optionItem, 
                    { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }
                  ]}
                  onPress={() => {
                    if (isDestructive) {
                      setShowDeleteConfirm(true)
                    } else {
                      option.onPress()
                      handleClose()
                    }
                  }}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={22} 
                    color={isDestructive ? colors.destructive : colors.foreground} 
                  />
                  <Text 
                    size="base" 
                    weight="600" 
                    style={[styles.optionText, isDestructive && { color: colors.destructive }]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Pressable>
      </Pressable>
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
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  optionText: {
    marginLeft: 16,
  },
  // Confirm sheet
  confirmSheet: {
    width: '100%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  confirmBody: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  dialogDesc: {
    textAlign: 'center',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
})
