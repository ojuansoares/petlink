export const tokens = {
  light: {
    background: '#FDFCF8',
    foreground: '#2C2C24',
    primary: '#5D7052',
    primaryForeground: '#F3F4F1',
    secondary: '#C18C5D',
    accent: '#E6DCCD',
    accentForeground: '#4A4A40',
    muted: '#F0EBE5',
    mutedForeground: '#78786C',
    border: '#DED8CF',
    destructive: '#A85448',
    destructiveForeground: '#F3F4F1',
    card: '#FEFEFA',
    headerBackground: '#E6E9DD',
    tabBarBackground: '#EDF0E6',
  },
  dark: {
    background: '#1C1C16',
    foreground: '#E8E6DF',
    primary: '#7A9470',
    primaryForeground: '#F3F4F1',
    secondary: '#C18C5D',
    accent: '#2E2C26',
    accentForeground: '#C8C4B8',
    muted: '#252520',
    mutedForeground: '#9A9A8E',
    border: '#3A3830',
    destructive: '#C06358',
    destructiveForeground: '#F3F4F1',
    card: '#222219',
    headerBackground: '#272A22',
    tabBarBackground: '#22241D',
  },
} as const

export type ThemePalette = typeof tokens.light
export type ThemeMode = keyof typeof tokens

export function withAlpha(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '')
  const [r, g, b] = sanitized.length === 3
    ? sanitized.split('').map((c) => parseInt(`${c}${c}`, 16))
    : [
        parseInt(sanitized.slice(0, 2), 16),
        parseInt(sanitized.slice(2, 4), 16),
        parseInt(sanitized.slice(4, 6), 16),
      ]

  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
