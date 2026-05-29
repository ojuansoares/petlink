import React, { useMemo } from 'react'
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'
import { getLevelColor } from '../../utils/levelColors'

interface AvatarProps {
  name?: string
  source?: ImageSourcePropType
  size?: number
  level?: number
}

function toInitials(name?: string): string {
  if (!name?.trim()) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function Avatar({ name, source, size = 48, level }: Readonly<AvatarProps>) {
  const { colors, withAlpha } = useTheme()
  const initials = useMemo(() => toInitials(name), [name])
  const levelColor = level ? getLevelColor(level) : undefined

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: levelColor ?? colors.border,
          backgroundColor: withAlpha(colors.accent, 0.45),
        },
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text weight="700" style={{ color: colors.accentForeground }}>
          {initials}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
