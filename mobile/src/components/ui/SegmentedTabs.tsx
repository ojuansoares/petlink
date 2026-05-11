import React from 'react'
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native'
import { Text } from './Typography'
import { useTheme } from '../../hooks/useTheme'

interface TabOption {
  id: string
  label: string
}

interface SegmentedTabsProps {
  options: TabOption[]
  activeId: string
  onChange: (id: string) => void
  style?: ViewStyle
}

/**
 * Standardized Segmented Control / Tabs for the application.
 */
export function SegmentedTabs({ options, activeId, onChange, style }: SegmentedTabsProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }, style]}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onChange(option.id)}
          style={[
            styles.tabButton,
            activeId === option.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            weight="800"
            size="sm"
            style={{ color: activeId === option.id ? colors.primary : colors.mutedForeground }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
})
