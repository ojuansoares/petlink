import React from 'react'
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

type CardVariant = 'default' | 'elevated' | 'organic'

interface CardProps extends ViewProps {
  variant?: CardVariant
  style?: StyleProp<ViewStyle>
}

export function Card({
  variant = 'default',
  style,
  children,
  ...props
}: Readonly<CardProps>) {
  const { colors, shadows, withAlpha } = useTheme()

  const variantStyle: ViewStyle =
    variant === 'organic'
      ? {
          borderRadius: 32,
          ...shadows.float,
        }
      : variant === 'elevated'
        ? {
            borderRadius: 24,
            ...shadows.soft,
          }
        : {
            borderRadius: 24,
          }

  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderColor: withAlpha(colors.border, 0.5),
        },
        variantStyle,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    padding: 16,
  },
})
