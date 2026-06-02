import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native'
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

const loadedUris = new Set<string>()

function AvatarComponent({ name, source, size = 48, level, loading = false }: Readonly<AvatarProps>) {
  const { colors, withAlpha } = useTheme()
  const initials = useMemo(() => toInitials(name), [name])
  const levelColor = level ? getLevelColor(level) : undefined
  const resolveUri = (s?: string | { uri?: string } | undefined) => {
    if (!s) return undefined
    return typeof s === 'string' ? s : s.uri
  }

  const imageUri = resolveUri(source)

  const lastUriRef = useRef(imageUri)
  const [ready, setReady] = useState(imageUri ? loadedUris.has(imageUri) : false)
  const [hasError, setHasError] = useState(false)

  if (lastUriRef.current !== imageUri) {
    lastUriRef.current = imageUri
    setReady(imageUri ? loadedUris.has(imageUri) : false)
    setHasError(false)
  }

  const isLoading = Boolean(imageUri) && !ready && !hasError

  const pulseAnim = useRef(new Animated.Value(0.15)).current

  useEffect(() => {
    if (!isLoading) {
      pulseAnim.setValue(0.15)
      return
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 800, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isLoading, pulseAnim])

  const handleLoad = useCallback(() => {
    if (imageUri) loadedUris.add(imageUri)
    setReady(true)
    setHasError(false)
  }, [imageUri])

  const handleError = useCallback(() => {
    setReady(false)
    setHasError(true)
  }, [])

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
      {loading ? (
        <ActivityIndicator size={size >= 56 ? 'large' : 'small'} color={colors.accentForeground} />
      ) : (
        <>
          {isLoading ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: size / 2, backgroundColor: colors.mutedForeground, opacity: pulseAnim },
              ]}
            />
          ) : (
            <Text weight="700" style={{ color: colors.accentForeground }}>
              {initials}
            </Text>
          )}
          {imageUri && !hasError ? (
            <ExpoImage
              source={imageUri}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : null}
        </>
      )}
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
