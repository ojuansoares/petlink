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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
      default: {},
    }),
    float: Platform.select({
      ios: {
        shadowColor: '#C18C5D',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 40,
      },
      android: { elevation: 8 },
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
