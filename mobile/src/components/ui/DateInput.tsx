import React from 'react'
import { StyleSheet, Pressable, View, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'
import { format } from 'date-fns'

interface DateInputProps {
  label?: string
  value: Date | null
  placeholder?: string
  onPress: () => void
  leftIconName?: any
  containerStyle?: ViewStyle
  error?: string
}

export function DateInput({
  label,
  value,
  placeholder,
  onPress,
  leftIconName,
  containerStyle,
  error,
}: DateInputProps) {
  const { colors, withAlpha } = useTheme()

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      )}
      
      <Pressable
        onPress={onPress}
        style={[
          styles.field,
          {
            backgroundColor: withAlpha(colors.card, 0.8),
            borderColor: error ? colors.destructive : colors.border,
          }
        ]}
      >
        {leftIconName && (
          <View style={styles.icon}>
            <Ionicons name={leftIconName} size={18} color={colors.mutedForeground} />
          </View>
        )}

        <Text 
          style={[
            styles.text, 
            { color: value ? colors.foreground : colors.mutedForeground }
          ]}
        >
          {value ? format(value, 'dd/MM/yyyy') : placeholder}
        </Text>

        <View style={styles.icon}>
          <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
        </View>
      </Pressable>
      {error && (
        <Text size="xs" style={{ color: colors.destructive, marginLeft: 12 }}>{error}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
  field: {
    minHeight: 48,
    borderRadius: 999, // Match Input.tsx
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 16,
  },
  icon: {
    marginHorizontal: 6,
  },
})
