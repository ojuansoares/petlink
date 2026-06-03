import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui/Typography'
import { useTheme } from '../../hooks/useTheme'

interface WalkStatsCardProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  color: string
}

export function WalkStatsCard({ icon, label, value, color }: WalkStatsCardProps) {
  const { colors, withAlpha } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: withAlpha(color, 0.08), borderColor: withAlpha(color, 0.2) }]}>
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(color, 0.15) }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text size="xs" color="mutedForeground" style={{ marginTop: 4 }}>{label}</Text>
      <Text weight="800" size="sm" style={{ color }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
