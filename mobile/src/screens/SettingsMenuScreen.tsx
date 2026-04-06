import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { Button } from '../components/ui/Button'
import { LogoutConfirmModal } from '../components/ui/LogoutConfirmModal'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch } from '../store'
import { logout, logoutThunk } from '../store/slices/authSlice'

interface MenuItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tab: 'Home' | 'Pets' | 'Feed' | 'Profile'
}

const MENU_ITEMS: readonly MenuItem[] = [
  { label: 'Home', icon: 'home-outline', tab: 'Home' },
  { label: 'Pets', icon: 'paw-outline', tab: 'Pets' },
  { label: 'Feed', icon: 'newspaper-outline', tab: 'Feed' },
  { label: 'Perfil', icon: 'person-circle-outline', tab: 'Profile' },
]

export default function SettingsMenuScreen({ navigation }: Readonly<{ navigation: any }>) {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)

  const goToTab = (tab: MenuItem['tab']) => {
    navigation.navigate('Tabs', { screen: tab })
  }

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap()
    } catch {
      dispatch(logout())
    }
  }

  const goToThemeSettings = () => {
    navigation.navigate('SettingsTheme')
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    await handleLogout()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.content}>
        <Heading size="2xl" weight="800">Explorar</Heading>
        <Text color="mutedForeground">Acesse rapidamente as principais areas do app.</Text>

        <Pressable
          onPress={goToThemeSettings}
          style={({ pressed }) => [
            styles.item,
            {
              borderColor: withAlpha(colors.border, 0.8),
              backgroundColor: pressed ? withAlpha(colors.primary, 0.1) : colors.card,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
            <Ionicons name="contrast-outline" size={20} color={colors.primary} />
          </View>
          <Text weight="700" size="lg">Tema</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} style={styles.chevron} />
        </Pressable>

        <View style={styles.items}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.tab}
              onPress={() => goToTab(item.tab)}
              style={({ pressed }) => [
                styles.item,
                {
                  borderColor: withAlpha(colors.border, 0.8),
                  backgroundColor: pressed ? withAlpha(colors.primary, 0.1) : colors.card,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text weight="700" size="lg">{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} style={styles.chevron} />
            </Pressable>
          ))}
        </View>
      </View>

      <Button label="Logout" variant="outline" onPress={() => setShowLogoutConfirm(true)} />

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  content: {
    gap: 10,
  },
  items: {
    marginTop: 10,
    gap: 10,
  },
  item: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  chevron: {
    marginLeft: 'auto',
  },
})
