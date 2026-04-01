import React from 'react'
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { fontFamilies, lineHeights, typeScale, TypeScaleKey } from '../../theme/typography'

type ColorKey = keyof ReturnType<typeof useTheme>['colors']

interface HeadingProps extends RNTextProps {
  size?: TypeScaleKey
  weight?: '600' | '800'
  color?: ColorKey
}

interface BodyTextProps extends RNTextProps {
  size?: TypeScaleKey
  weight?: '400' | '600' | '700'
  color?: ColorKey
}

export function Heading({
  size = '2xl',
  weight = '600',
  color = 'foreground',
  style,
  children,
  ...props
}: Readonly<HeadingProps>) {
  const { colors } = useTheme()

  const textStyle: TextStyle = {
    color: colors[color],
    fontSize: typeScale[size],
    lineHeight: lineHeights[size],
    fontFamily: weight === '800' ? fontFamilies.heading800 : fontFamilies.heading600,
  }

  return (
    <RNText {...props} style={[textStyle, style]}>
      {children}
    </RNText>
  )
}

export function Text({
  size = 'base',
  weight = '400',
  color = 'foreground',
  style,
  children,
  ...props
}: Readonly<BodyTextProps>) {
  const { colors } = useTheme()

  const fontFamily =
    weight === '700'
      ? fontFamilies.body700
      : weight === '600'
        ? fontFamilies.body600
        : fontFamilies.body400

  const textStyle: TextStyle = {
    color: colors[color],
    fontSize: typeScale[size],
    lineHeight: lineHeights[size],
    fontFamily,
  }

  return (
    <RNText {...props} style={[textStyle, style]}>
      {children}
    </RNText>
  )
}
