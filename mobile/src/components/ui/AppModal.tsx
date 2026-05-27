import React from 'react'
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../hooks/useTheme'
import { Heading, Text } from './Typography'
import { AppToast } from './AppToast'

interface AppModalProps {
  visible: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  sheetStyle?: ViewStyle
  showHandle?: boolean
  showCloseButton?: boolean
}

/**
 * Standardized Bottom Sheet Modal for the application.
 * Handles KeyboardAvoidingView, Safe Area insets, and consistent styling.
 */
export function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  sheetStyle,
  showHandle = true,
  showCloseButton = true,
}: AppModalProps) {
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()

  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <AppToast />
      <KeyboardAvoidingView behavior={keyboardBehavior} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
            sheetStyle,
          ]}
        >
          {/* Handle */}
          {showHandle && (
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>
          )}

          {/* Header */}
          {(title || subtitle || showCloseButton) && (
            <View style={[styles.header, !showHandle && { paddingTop: 20 }]}>
              <View style={{ flex: 1 }}>
                {title && <Heading size="2xl" weight="800">{title}</Heading>}
                {subtitle && <Text size="sm" color="mutedForeground">{subtitle}</Text>}
              </View>
              {showCloseButton && (
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </Pressable>
              )}
            </View>
          )}

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  content: {
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
})
