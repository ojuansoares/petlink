import React from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, Platform } from 'react-native'
import { useAppSelector } from '../store'
import { selectIsAuth, selectIsPasswordResetFlow } from '../store/slices/authSlice'
import { selectIsDark } from '../store/slices/uiSlice'
import { tokens, withAlpha } from '../theme'
import AuthStack from './AuthStack'
import AppTabs from './AppTabs'
import SettingsMenuScreen from '../screens/SettingsMenuScreen'
import PublicProfileScreen from '../screens/PublicProfileScreen'
import ProfileFeedScreen from '../screens/ProfileFeedScreen'
import SearchScreen from '../screens/SearchScreen'
import GroupsScreen from '../screens/GroupsScreen'
import GroupDetailScreen from '../screens/GroupDetailScreen'
import { AppStackParamList } from './types'
import { navigationRef } from './navigationRef'
import { VaccineScreen } from '../screens/Pets/VaccineScreen';
import { ConsultationScreen } from '../screens/Pets/ConsultationScreen';
import FeedingScreen from '../screens/Pets/FeedingScreen';
import ActivityTimelineScreen from '../screens/ActivityTimelineScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['petlink://'],
  config: {
    screens: {
      PublicProfile: 'profile/:userId',
      GroupDetail: 'group/:groupId',
    },
  },
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

function PublicProfileBackButton({ onPress }: Readonly<{ onPress?: () => void }>) {
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
  const isDark = useAppSelector(selectIsDark)
  const palette = isDark ? tokens.dark : tokens.light

  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: palette.headerBackground,
          borderBottomWidth: 1,
          borderBottomColor: withAlpha(palette.border, 0.75),
          shadowOpacity: 0,
          elevation: 0,
        },
      }}
    >
      <AppStack.Screen
        name="Tabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Pesquisar',
          headerLeft: PublicProfileBackButton,
        }}
      />
      <AppStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          title: 'Grupos',
          headerLeft: PublicProfileBackButton,
        }}
      />
      <AppStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={({ route }) => ({
          title: route.params.groupName || 'Grupo',
          headerLeft: PublicProfileBackButton,
        })}
      />
      <AppStack.Screen
        name="SettingsMenu"
        component={SettingsMenuScreen}
        options={{
          title: 'Configurações',
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
      <AppStack.Screen
        name="SettingsNotifications"
        component={require('../screens/SettingsNotificationsScreen').default}
        options={{
          title: 'Notificações',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="SettingsSecurity"
        component={require('../screens/SettingsSecurityScreen').default}
        options={{
          title: 'Segurança',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="SettingsDangerZone"
        component={require('../screens/SettingsDangerZoneScreen').default}
        options={{
          title: 'Zona sensível',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="Vaccine"
        component={VaccineScreen}
        options={{
          title: 'Vacinas e Vermífugos',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="Consultation"
        component={ConsultationScreen}
        options={{
          title: 'Consultas Veterinárias',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="FeedingPlan"
        component={FeedingScreen}
        options={{
          title: 'Alimentação',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="ActivityTimeline"
        component={ActivityTimelineScreen}
        options={{
          title: 'Atividades',
          headerLeft: SettingsBackButton,
        }}
      />
      <AppStack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{
          title: 'Perfil',
          headerLeft: PublicProfileBackButton,
        }}
      />
      <AppStack.Screen
        name="ProfileFeed"
        component={ProfileFeedScreen}
        options={({ route }) => ({
          title: route.params.title || 'Publicações',
          headerLeft: PublicProfileBackButton,
        })}
      />
    </AppStack.Navigator>
  )
}

export default function RootNavigator() {
  const isAuth = useAppSelector(selectIsAuth)
  const isPasswordResetFlow = useAppSelector(selectIsPasswordResetFlow)
  const isDark = useAppSelector(selectIsDark)
  const baseTheme = isDark ? DarkTheme : DefaultTheme
  const palette = isDark ? tokens.dark : tokens.light

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
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
      {isPasswordResetFlow ? <ResetPasswordScreen /> : isAuth ? <AuthenticatedNavigator /> : <AuthStack />}
    </NavigationContainer>
  )
}