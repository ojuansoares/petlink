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

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string
  variant?: Variant
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: ViewStyle | ViewStyle[]
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Button({
  label,
  variant = 'primary',
  size = 'md',
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
        : variant === 'destructive'
          ? {
              backgroundColor: isDisabled ? withAlpha(colors.destructive, 0.3) : colors.destructive,
              borderColor: colors.destructive,
              ...shadows.soft,
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
        : variant === 'destructive'
          ? colors.destructiveForeground
          : colors.foreground

  const sizeStyle: ViewStyle = 
    size === 'sm' 
      ? { minHeight: 36, paddingHorizontal: 12 } 
      : size === 'lg' 
        ? { minHeight: 56, paddingHorizontal: 24 } 
        : { minHeight: 48, paddingHorizontal: 18 }

  const labelSize = size === 'sm' ? 'xs' : size === 'lg' ? 'base' : 'sm'

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
      style={[styles.base, variantStyle, sizeStyle, isDisabled && styles.disabled, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text size={labelSize as any} weight="700" style={{ color: labelColor }}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.65,
  },
})
