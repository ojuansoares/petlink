import React from 'react'
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Heading, Text } from '../../../components/ui/Typography'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'

interface ControlCardProps {
  title: string
  subtitle: string
  icon: any
  color: string
  borderColor: string
  iconColor: string
  badge: string
  onPress: () => void
}

export function ControlCard({
  title,
  subtitle,
  icon,
  color,
  borderColor,
  iconColor,
  badge,
  onPress,
}: ControlCardProps) {
  const styles = usePetsStyles()
  const { withAlpha } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.controlCard,
        { backgroundColor: color, borderColor: borderColor }
      ]}
    >
      <View style={[styles.controlIconContainer, { backgroundColor: withAlpha(iconColor, 0.1) }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.controlInfo}>
        <Heading size="sm" weight="800" style={{ color: iconColor }}>{title}</Heading>
        <Text size="xs" weight="600" style={{ color: iconColor, opacity: 0.8 }}>{subtitle}</Text>
      </View>
      <View style={[styles.controlBadge, { backgroundColor: withAlpha(iconColor, 0.15) }]}>
        <Text size="xs" weight="800" style={{ color: iconColor }}>{badge}</Text>
      </View>
    </Pressable>
  )
}
