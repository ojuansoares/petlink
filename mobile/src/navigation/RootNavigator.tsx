import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'
import { useAppSelector } from '../store'
import { selectIsAuth } from '../store/slices/authSlice'
import { selectIsDark } from '../store/slices/uiSlice'
import { tokens } from '../theme'
import AuthStack from './AuthStack'
import AppTabs from './AppTabs'
import SettingsMenuScreen from '../screens/SettingsMenuScreen'

type AppStackParamList = {
  Tabs: undefined
  SettingsMenu: undefined
  SettingsTheme: undefined
}

const AppStack = createStackNavigator<AppStackParamList>()

function SettingsBackButton({ onPress }: Readonly<{ onPress?: () => void }>) {
  const isDark = useAppSelector(selectIsDark)
  const palette = isDark ? tokens.dark : tokens.light

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ marginLeft: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name="chevron-back" size={24} color={palette.foreground} />
    </Pressable>
  )
}

function AuthenticatedNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen
        name="Tabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="SettingsMenu"
        component={SettingsMenuScreen}
        options={{
          title: 'Configuracoes',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="SettingsTheme"
        component={require('../screens/ThemeSettingsScreen').default}
        options={{
          title: 'Tema',
          headerLeft: SettingsBackButton,
        }}
      />
    </AppStack.Navigator>
  )
}

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
      {isAuth ? <AuthenticatedNavigator /> : <AuthStack />}
    </NavigationContainer>
  )
}