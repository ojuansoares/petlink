import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useTheme, AppTheme } from '../hooks/useTheme'

type NamedStyles<T> = StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>

/**
 * A utility hook that injects the current theme into a StyleSheet generator function.
 * It uses `useMemo` so that the StyleSheet is only re-calculated when the theme mode changes.
 * 
 * Usage:
 * const styles = useStyles()
 * 
 * const useStyles = makeStyles((theme) => ({
 *   container: { backgroundColor: theme.colors.background },
 *   text: { color: theme.colors.foreground }
 * }))
 */
export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  stylesFactory: (theme: AppTheme) => T
) {
  return () => {
    const theme = useTheme()
    // By depending on theme.mode, we only recreate the stylesheet when Dark/Light changes.
    // Use the whole theme object so colors, shadows, and helpers are available.
    return useMemo(() => StyleSheet.create(stylesFactory(theme)), [theme.mode])
  }
}
