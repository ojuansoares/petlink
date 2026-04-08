import React, { ReactNode, useMemo, useState } from 'react'
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'

interface InputProps extends TextInputProps {
  label?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  containerStyle?: ViewStyle
}

export function Input({
  label,
  leftIcon,
  rightIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: Readonly<InputProps>) {
  const { colors, shadows, withAlpha } = useTheme()
  const [focused, setFocused] = useState(false)
  const glow = useSharedValue(0)

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(glow.value, { duration: 300 }),
  }))

  const fieldStyle = useMemo(
    () => ({
      backgroundColor: withAlpha(colors.card, 0.8),
      borderColor: focused ? colors.primary : colors.border,
      ...(focused ? shadows.soft : {}),
    }),
    [colors.border, colors.card, colors.primary, focused, shadows.soft, withAlpha],
  )

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Animated.Text style={[styles.label, { color: focused ? colors.primary : colors.mutedForeground }]}>
          {label}
        </Animated.Text>
      ) : null}
      
      <View style={styles.containerRelative}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.glow,
            { backgroundColor: withAlpha(colors.primary, 0.12) },
            animatedGlowStyle,
          ]}
        />

        <View style={[styles.field, fieldStyle]}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}

          <TextInput
            {...props}
            style={[styles.input, { color: colors.foreground }]}
            placeholderTextColor={colors.mutedForeground}
            onFocus={(e) => {
              setFocused(true)
              glow.value = 1
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              glow.value = 0
              onBlur?.(e)
            }}
          />

          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      </View>
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
  containerRelative: {
    width: '100%',
    minHeight: 48,
  },
  glow: {
    borderRadius: 999,
  },
  field: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    paddingVertical: 0,
  },
  icon: {
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
