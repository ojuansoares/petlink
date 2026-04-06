import React from 'react'
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'

interface AppLoadingOverlayProps {
  visible: boolean
  message: string
}

export function AppLoadingOverlay({ visible, message }: Readonly<AppLoadingOverlayProps>) {
  const { colors, withAlpha } = useTheme()
  const opacity = React.useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = React.useState(visible)

  React.useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
      return
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false)
      }
    })
  }, [visible, opacity])

  if (!mounted) return null

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.backdrop,
        {
          backgroundColor: withAlpha(colors.background, 0.82),
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text weight="700" size="lg" style={{ color: colors.foreground }}>{message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
})
