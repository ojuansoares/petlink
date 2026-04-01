const ratio = 1.25
const base = 16

function round(value: number): number {
  return Math.round(value)
}

export const typeScale = {
  xs: round(base / ratio),
  sm: round(base / (ratio * 0.9)),
  base,
  lg: round(base * ratio),
  xl: round(base * ratio * ratio),
  '2xl': round(base * ratio * ratio * ratio),
  '3xl': round(base * ratio * ratio * ratio * ratio),
  '4xl': round(base * ratio * ratio * ratio * ratio * ratio),
} as const

export type TypeScaleKey = keyof typeof typeScale

export const fontFamilies = {
  heading600: 'Fraunces_600SemiBold',
  heading800: 'Fraunces_800ExtraBold',
  body400: 'Nunito_400Regular',
  body600: 'Nunito_600SemiBold',
  body700: 'Nunito_700Bold',
} as const

export const lineHeights: Record<TypeScaleKey, number> = {
  xs: round(typeScale.xs * 1.35),
  sm: round(typeScale.sm * 1.35),
  base: round(typeScale.base * 1.4),
  lg: round(typeScale.lg * 1.35),
  xl: round(typeScale.xl * 1.3),
  '2xl': round(typeScale['2xl'] * 1.25),
  '3xl': round(typeScale['3xl'] * 1.2),
  '4xl': round(typeScale['4xl'] * 1.15),
}
