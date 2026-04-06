import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '../components/ui/Avatar'
import { useTheme } from '../hooks/useTheme'
import HomeScreen from '../screens/HomeScreen'
import PetsScreen from '../screens/PetsScreen'
import FeedScreen from '../screens/FeedScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useAppDispatch, useAppSelector } from '../store'
import { selectUser } from '../store/slices/authSlice'
import { fetchMyProfileThunk, selectProfile } from '../store/slices/profileSlice'
import { toggleTheme } from '../store/slices/uiSlice'

type AppTabsParamList = {
  Home: undefined
  Pets: undefined
  Feed: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<AppTabsParamList>()

function ThemeToggleButton() {
  const dispatch = useAppDispatch()
  const { isDark, colors } = useTheme()

  return (
    <Pressable
      onPress={() => dispatch(toggleTheme())}
      hitSlop={8}
      style={styles.headerIconButton}
      accessibilityRole="button"
      accessibilityLabel="Alternar tema"
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={22}
        color={colors.foreground}
      />
    </Pressable>
  )
}

function HeaderActions() {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const user = useAppSelector(selectUser)
  const profile = useAppSelector(selectProfile)

  const avatarName = profile?.name ?? user?.name ?? 'Usuario'
  const avatarSource = profile?.avatar_url ? { uri: profile.avatar_url } : undefined

  return (
    <>
      <Pressable
        onPress={() => {
          navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
          navigation.navigate('Profile')
        }}
        hitSlop={8}
        style={styles.headerAvatarButton}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
      >
        <Avatar name={avatarName} source={avatarSource} size={34} />
      </Pressable>

      <Pressable
        onPress={() => navigation.getParent()?.navigate('SettingsMenu')}
        hitSlop={8}
        style={styles.headerIconButton}
        accessibilityRole="button"
        accessibilityLabel="Abrir configuracoes"
      >
        <Ionicons name="menu" size={24} color={colors.foreground} />
      </Pressable>
    </>
  )
}

function TabBarGlassBackground() {
  const { isDark } = useTheme()

  return (
    <View style={styles.fullFill}>
      {Platform.OS === 'ios' ? (
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={95}
          style={styles.fullFill}
        />
      ) : null}
    </View>
  )
}

function HomeTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
}

function PetsTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'paw' : 'paw-outline'} size={26} color={color} />
}

function FeedTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={26} color={color} />
}

function ProfileTabIcon({ color, focused }: Readonly<{ color: string; focused: boolean }>) {
  return <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={28} color={color} />
}

export default function AppTabs() {
  const dispatch = useAppDispatch()
  const { isDark, colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()

  const tabBarHeight   = 66
  const floatingGap   = 22
  const bottomOffset  = insets.bottom + 14

  // Máscara vertical — altura generosa para a transição ser bem suave
  const maskHeight = tabBarHeight + bottomOffset + 48

  // Android: fundo sólido na navbar já que não tem BlurView
  const androidTabBarBackground = withAlpha(colors.card, isDark ? 0.9 : 0.95)

  // Máscara vertical: começa transparente, fecha devagar e suavemente
  const outerMaskTop    = withAlpha(colors.background, 0)
  const outerMaskMid1   = withAlpha(colors.background, isDark ? 0.15 : 0.18)
  const outerMaskMid2   = withAlpha(colors.background, isDark ? 0.55 : 0.62)
  const outerMaskBottom = withAlpha(colors.background, 1)

  // Máscaras laterais — bem suaves, só um toque
  const sideFade = withAlpha(colors.background, 0.45)

  React.useEffect(() => {
    dispatch(fetchMyProfileThunk())
  }, [dispatch])

  return (
    <View style={styles.root}>
      <Tab.Navigator
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerStyle: {
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: withAlpha(colors.border, 0.75),
          },
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 12 },
          headerRightContainerStyle: { paddingRight: 12 },
          headerLeft: ThemeToggleButton,
          headerRight: HeaderActions,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarItemStyle: {
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 0,
            paddingBottom: 0,
          },
          tabBarIconStyle: {
            height: '100%',
            width: '100%',
            alignSelf: 'center',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 0,
            marginBottom: 0,
          },
          tabBarStyle: [
            styles.tabBar,
            {
              marginHorizontal: floatingGap,
              bottom: bottomOffset,
              height: tabBarHeight,
              paddingTop: 0,
              paddingBottom: 0,
              // iOS: transparente para o BlurView aparecer
              // Android: sólido semitransparente
              backgroundColor:
                Platform.OS === 'ios' ? 'transparent' : androidTabBarBackground,
              borderWidth: 1,
              borderTopWidth: 1,
              borderColor: withAlpha(colors.border, 0.5),
              zIndex: 4,
              ...Platform.select({
                ios: {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.12,
                  shadowRadius: 20,
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
        <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarIcon: HomeTabIcon }} />
        <Tab.Screen name="Pets"    component={PetsScreen}    options={{ tabBarIcon: PetsTabIcon }} />
        <Tab.Screen name="Feed"    component={FeedScreen}    options={{ tabBarIcon: FeedTabIcon }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ProfileTabIcon }} />
      </Tab.Navigator>

      {/* Máscara vertical — esmaece o conteúdo que passa atrás da navbar */}
      <LinearGradient
        pointerEvents="none"
        colors={[outerMaskTop, outerMaskMid1, outerMaskMid2, outerMaskBottom]}
        locations={[0, 0.25, 0.65, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.behindMask, { bottom: 0, height: maskHeight }]}
      />

      {/* Máscara lateral esquerda — toque suave nas bordas da navbar */}
      <LinearGradient
        pointerEvents="none"
        colors={[sideFade, withAlpha(colors.background, 0)]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.sideMask,
          {
            left: 0,
            width: floatingGap + 8,
            bottom: bottomOffset,
            height: tabBarHeight,
          },
        ]}
      />

      {/* Máscara lateral direita */}
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.background, 0), sideFade]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.sideMask,
          {
            right: 0,
            width: floatingGap + 8,
            bottom: bottomOffset,
            height: tabBarHeight,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarButton: {
    marginRight: 10,
  },
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    borderRadius: 30,
    overflow: 'visible',
  },
  fullFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  behindMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  sideMask: {
    position: 'absolute',
    zIndex: 3,
  },
})