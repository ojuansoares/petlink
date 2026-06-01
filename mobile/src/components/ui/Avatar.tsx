import React, { useEffect, useMemo, useState, memo } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'
import { getLevelColor } from '../../utils/levelColors'

interface AvatarProps {
  name?: string
  source?: string | { uri?: string } | undefined
  size?: number
  level?: number
  loading?: boolean
}

function toInitials(name?: string): string {
  if (!name?.trim()) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function AvatarComponent({ name, source, size = 48, level, loading = false }: Readonly<AvatarProps>) {
  const { colors, withAlpha } = useTheme()
  const initials = useMemo(() => toInitials(name), [name])
  const levelColor = level ? getLevelColor(level) : undefined
  const resolveUri = (s?: string | { uri?: string } | undefined) => {
    if (!s) return undefined
    return typeof s === 'string' ? s : s.uri
  }

  const imageUri = resolveUri(source)
  const [loaded, setLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)

  useEffect(() => {
    setHasImageError(false)
    // keep `loaded` false until the image actually emits `onLoad`
    setLoaded(false)
  }, [imageUri])

  const shouldShowImage = Boolean(imageUri) && !hasImageError
  const shouldShowFallback = !shouldShowImage && !loading

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
      {shouldShowImage && imageUri ? (
        <ExpoImage
          source={{ uri: imageUri }}
          style={[
            StyleSheet.absoluteFillObject,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: loaded ? 1 : 0,
            },
          ]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={250}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasImageError(true)
            setLoaded(false)
          }}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator size={size >= 56 ? 'large' : 'small'} color={colors.accentForeground} />
      ) : null}

      {shouldShowFallback ? (
        <Text weight="700" style={{ color: colors.accentForeground }}>
          {initials}
        </Text>
      ) : null}
    </View>
  )
}

function areEqual(prev: Readonly<AvatarProps>, next: Readonly<AvatarProps>) {
  const resolve = (s?: string | { uri?: string } | undefined) => (typeof s === 'string' ? s : s?.uri)
  return (
    resolve(prev.source) === resolve(next.source) &&
    prev.size === next.size &&
    prev.level === next.level &&
    prev.name === next.name &&
    prev.loading === next.loading
  )
}

export const Avatar = memo(AvatarComponent, areEqual)

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
