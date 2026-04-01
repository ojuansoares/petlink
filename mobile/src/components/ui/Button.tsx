import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'

type Variant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string
  variant?: Variant
  loading?: boolean
  style?: ViewStyle | ViewStyle[]
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}: Readonly<ButtonProps>) {
  const { colors, shadows, withAlpha } = useTheme()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isDisabled = Boolean(disabled || loading)

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: isDisabled ? withAlpha(colors.mutedForeground, 0.3) : colors.primary,
          borderColor: colors.primary,
          ...shadows.soft,
        }
      : variant === 'outline'
        ? {
            backgroundColor: 'transparent',
            borderColor: colors.primary,
          }
        : {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }

  const labelColor =
    variant === 'primary'
      ? colors.primaryForeground
      : variant === 'outline'
        ? colors.primary
        : colors.foreground

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 100 })
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 100 })
        onPressOut?.(e)
      }}
      disabled={isDisabled}
      style={[styles.base, variantStyle, isDisabled && styles.disabled, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text weight="700" style={{ color: labelColor }}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.65,
  },
})
