import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { useAppSelector } from '../store'
import { selectIsAuth } from '../store/slices/authSlice'
import { selectIsDark } from '../store/slices/uiSlice'
import AuthStack from './AuthStack'
import AppTabs from './AppTabs'

export default function RootNavigator() {
  const isAuth = useAppSelector(selectIsAuth)
  const isDark = useAppSelector(selectIsDark)
  const baseTheme = isDark ? DarkTheme : DefaultTheme

  return (
    <NavigationContainer
      theme={{
        ...baseTheme,
        colors: isDark
          ? {
              ...baseTheme.colors,
              primary:    '#7F77DD',
              background: '#1a1a1a',
              card:       '#2a2a2a',
              text:       '#f0f0f0',
              border:     '#3a3a3a',
              notification: '#7F77DD',
            }
          : {
              ...baseTheme.colors,
              primary:    '#534AB7',
              background: '#ffffff',
              card:       '#f8f8f8',
              text:       '#1a1a1a',
              border:     '#e0e0e0',
              notification: '#534AB7',
            },
      }}
    >
      {isAuth ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  )
}