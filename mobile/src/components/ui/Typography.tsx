import React from 'react'
import {
  Text as RNText,
  TextProps as RNTextProps,
  TextStyle,
} from 'react-native'
import { tokens } from '../../theme'
import { fontFamilies, lineHeights, typeScale, TypeScaleKey } from '../../theme/typography'
import { useTheme } from '../../hooks/useTheme'

type ColorKey = keyof typeof tokens.light

interface HeadingProps extends RNTextProps {
  size?: TypeScaleKey
  weight?: '600' | '700' | '800' | '900'
  color?: ColorKey
}

interface BodyTextProps extends RNTextProps {
  size?: TypeScaleKey
  weight?: '400' | '600' | '700' | '800' | '900'
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
    fontFamily: weight === '900' ? fontFamilies.heading800 : (weight === '800' ? fontFamilies.body800 : fontFamilies.heading600),
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
    weight === '900'
      ? fontFamilies.heading800
      : weight === '800'
        ? fontFamilies.body800
        : weight === '700'
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
