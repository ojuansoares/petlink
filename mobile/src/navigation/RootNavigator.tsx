import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { useAppSelector } from '../store'
import { selectIsAuth } from '../store/slices/authSlice'
import { selectIsDark } from '../store/slices/uiSlice'
import { tokens } from '../theme'
import AuthStack from './AuthStack'
import AppTabs from './AppTabs'

export default function RootNavigator() {
  const isAuth = useAppSelector(selectIsAuth)
  const isDark = useAppSelector(selectIsDark)
  const baseTheme = isDark ? DarkTheme : DefaultTheme
  const palette = isDark ? tokens.dark : tokens.light

  return (
    <NavigationContainer
      theme={{
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.card,
          text: palette.foreground,
          border: palette.border,
          notification: palette.secondary,
        },
      }}
    >
      {isAuth ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  )
}