import { Platform } from 'react-native'
import { useAppSelector } from '../store'
import { selectIsDark } from '../store/slices/uiSlice'
import { tokens, withAlpha } from '../theme'

export function useTheme() {
  const isDark = useAppSelector(selectIsDark)
  const colors = isDark ? tokens.dark : tokens.light

  const shadows = {
    soft: Platform.select({
      ios: {
        shadowColor: '#5D7052',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
    float: Platform.select({
      ios: {
        shadowColor: '#C18C5D',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: { elevation: 5 },
      default: {},
    }),
  } as const

  return {
    isDark,
    mode: isDark ? 'dark' : 'light',
    colors,
    shadows,
    withAlpha,
  }
}

export type AppTheme = ReturnType<typeof useTheme>
