import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { Platform, StyleSheet, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import HomeScreen from '../screens/HomeScreen'
import { Heading, Text } from '../components/ui/Typography'

type AppTabsParamList = {
  Home: undefined
  Explore: undefined
}

const Tab = createBottomTabNavigator<AppTabsParamList>()

function TabBarGlassBackground() {
  const { isDark } = useTheme()

  return (
    <BlurView
      tint={isDark ? 'dark' : 'light'}
      intensity={75}
      style={styles.blurBackground}
    />
  )
}

function HomeTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
}

function ExploreTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
}

function ExplorePlaceholder() {
  const { colors } = useTheme()

  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}> 
      <Heading size="2xl" weight="800">Explore</Heading>
      <Text color="mutedForeground">Aba de exploracao em breve.</Text>
    </View>
  )
}

export default function AppTabs() {
  const { colors, withAlpha } = useTheme()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: 'transparent',
            borderColor: withAlpha(colors.border, 0.6),
            ...Platform.select({
              ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.14,
                shadowRadius: 24,
              },
              android: {
                elevation: 10,
              },
            }),
          },
        ],
        tabBarBackground: TabBarGlassBackground,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExplorePlaceholder}
        options={{
          tabBarIcon: ExploreTabIcon,
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    height: 68,
    borderTopWidth: 1,
    borderRadius: 30,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 34,
    overflow: 'hidden',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 96,
  },
})
