import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Platform, Pressable, StyleSheet, View, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '../components/ui/Avatar'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import HomeScreen from '../screens/HomeScreen'
import PetsScreen from '../screens/PetsScreen'
import FeedScreen from '../screens/FeedScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useAppDispatch, useAppSelector } from '../store'
import { selectUser } from '../store/slices/authSlice'
import { fetchMyProfileThunk, selectProfile } from '../store/slices/profileSlice'
import { fetchPetsThunk } from '../store/slices/petsSlice'
import { fetchGamificationThunk, selectGamification } from '../store/slices/gamificationSlice'

type AppTabsParamList = {
  Home: undefined
  Pets: undefined
  Feed: undefined
  Profile: undefined
}

const Tab = createBottomTabNavigator<AppTabsParamList>()

function UserRegionHeader() {
  const navigation = useNavigation<any>()
  const { colors, withAlpha } = useTheme()
  const profile = useAppSelector(selectProfile)
  
  const location = profile?.location || 'BR'

  return (
    <Pressable 
      onPress={() => navigation.navigate('Profile')}
      accessibilityRole="button"
      accessibilityLabel="Ir para o perfil e mudar localização"
      style={({ pressed }) => [
        styles.regionBadge,
        { 
          backgroundColor: withAlpha(colors.primary, 0.08),
          borderColor: withAlpha(colors.primary, 0.15),
          opacity: pressed ? 0.7 : 1,
        }
      ]}
    >
      <Ionicons name="location-sharp" size={14} color={colors.primary} />
      <Text weight="700" size="xs" style={{ color: colors.primary, marginLeft: 4 }}>
        {location}
      </Text>
    </Pressable>
  )
}

function HeaderActions() {
  const navigation = useNavigation<any>()
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const user = useAppSelector(selectUser)
  const profile = useAppSelector(selectProfile)
  const gamificationStats = useAppSelector(selectGamification)

  const avatarName = profile?.name ?? user?.name ?? 'Usuario'
  const avatarSource = profile?.avatar_url ? { uri: profile.avatar_url } : undefined

  const navigateToProfile = () => {
    navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
  }

  return (
    <>
      <Pressable
        onPress={() => navigation.getParent()?.navigate('Search')}
        hitSlop={8}
        style={styles.headerIconButton}
        accessibilityRole="button"
        accessibilityLabel="Pesquisar"
      >
        <Ionicons name="search-outline" size={24} color={colors.foreground} />
      </Pressable>

      <Pressable
        onPress={navigateToProfile}
        hitSlop={8}
        style={styles.headerAvatarButton}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil"
      >
        <Avatar name={avatarName} source={avatarSource} size={34} level={gamificationStats?.level} />
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


const ICONS: Record<string, { active: any, inactive: any, label: string }> = {
  Home: { active: 'home', inactive: 'home-outline', label: 'Início' },
  Pets: { active: 'paw', inactive: 'paw-outline', label: 'Pets' },
  Feed: { active: 'newspaper', inactive: 'newspaper-outline', label: 'Feed' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Perfil' },
}

function TabBarItem({ route, isFocused, onPress }: any) {
  const { colors } = useTheme()
  const anim = React.useRef(new Animated.Value(isFocused ? 1 : 0)).current

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      friction: 10,
      tension: 50,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    }).start()
  }, [isFocused])

  const config = ICONS[route.name] || ICONS.Home

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.primary]
  })

  const maxWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100]
  })

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1]
  })

  return (
    <Pressable onPress={onPress} style={styles.tabItemWrapper}>
      <Animated.View style={[styles.tabItem, { backgroundColor }]}>
        <View style={styles.iconWrapper}>
          <Animated.View style={{ position: 'absolute', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
            <Ionicons name={config.inactive} size={22} color={colors.mutedForeground} />
          </Animated.View>
          <Animated.View style={{ position: 'absolute', opacity: anim }}>
            <Ionicons name={config.active} size={22} color="#FFFFFF" />
          </Animated.View>
        </View>
        <Animated.View style={{ maxWidth, overflow: 'hidden' }}>
          <Animated.Text style={[styles.tabItemLabel, { opacity }]} numberOfLines={1}>
            {config.label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  )
}

function CustomTabBar({ state, descriptors, navigation, insets }: any) {
  const { colors, isDark, withAlpha } = useTheme()
  const tabBarHeight = 66
  const floatingGap  = 22
  const bottomOffset = insets.bottom + 14

  const glassBackground = withAlpha(colors.tabBarBackground, isDark ? 0.88 : 0.92)
  const glassBorder     = withAlpha(colors.border, isDark ? 0.35 : 0.45)

return (
    <View style={[
      styles.tabBar,
      {
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginHorizontal: floatingGap,
        bottom: bottomOffset,
        height: tabBarHeight,
        backgroundColor: glassBackground,
        borderWidth: 1,
        borderColor: glassBorder,
        zIndex: 4,
      }
    ]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <TabBarItem 
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
          />
        )
      })}
    </View>
  )
}

export default function AppTabs() {
  const dispatch = useAppDispatch()
  const { isDark, colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()

  const tabBarHeight = 66
  const floatingGap  = 22
  const bottomOffset = insets.bottom + 14

  // Máscara vertical — altura generosa para a transição ser bem suave
  const maskHeight = tabBarHeight + bottomOffset + 48

  // Máscara vertical: começa transparente, fecha devagar e suavemente
  const outerMaskTop    = withAlpha(colors.background, 0)
  const outerMaskMid1   = withAlpha(colors.background, isDark ? 0.15 : 0.18)
  const outerMaskMid2   = withAlpha(colors.background, isDark ? 0.55 : 0.62)
  const outerMaskBottom = withAlpha(colors.background, 1)

  // Máscaras laterais — bem suaves, só um toque
  const sideFade = withAlpha(colors.background, 0.45)

  React.useEffect(() => {
    dispatch(fetchMyProfileThunk())
    dispatch(fetchPetsThunk())
    dispatch(fetchGamificationThunk())
  }, [dispatch])

  return (
    <View style={styles.root}>
      <Tab.Navigator
        safeAreaInsets={{ bottom: 0 }}
        tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
        screenOptions={{
          headerShown: true,
          headerTitle: '',
          headerStyle: {
            backgroundColor: colors.headerBackground,
            borderBottomWidth: 1,
            borderBottomColor: withAlpha(colors.border, 0.75),
          },
          headerShadowVisible: false,
          headerLeftContainerStyle: { paddingLeft: 12 },
          headerRightContainerStyle: { paddingRight: 12 },
          headerLeft: () => <UserRegionHeader />,
          headerRight: () => <HeaderActions />,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tab.Screen name="Home"    component={HomeScreen} />
        <Tab.Screen name="Pets"    component={PetsScreen} />
        <Tab.Screen name="Feed"    component={FeedScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
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
    marginHorizontal: 8,
  },
  regionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    borderRadius: 30,
    overflow: 'hidden',
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
  tabItemWrapper: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemLabel: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
})