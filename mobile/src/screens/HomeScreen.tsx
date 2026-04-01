import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { logout, logoutThunk, selectUser } from '../store/slices/authSlice'
import { selectIsDark, toggleTheme } from '../store/slices/uiSlice'

export default function HomeScreen() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()
  const user = useAppSelector(selectUser)
  const isDark = useAppSelector(selectIsDark)

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap()
    } catch {
      dispatch(logout())
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <Pressable
        style={[
          styles.themeSwitch,
          { backgroundColor: withAlpha(colors.card, 0.85), borderColor: colors.border },
        ]}
        onPress={() => dispatch(toggleTheme())}
      >
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.foreground} />
      </Pressable>

      <View style={styles.content}>
        <Heading size="3xl" weight="800">Home</Heading>
        <Text size="sm" color="mutedForeground">Seu espaco inicial no estilo organico do PetLink.</Text>

        <Card variant="organic" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={user?.name ?? user?.email ?? 'Tutor'} size={56} />
            <View style={styles.profileInfo}>
              <Text weight="700">{user?.name ?? 'Tutor'}</Text>
              <Text size="sm" color="mutedForeground">{user?.email ?? 'sem email no perfil'}</Text>
            </View>
          </View>
        </Card>

        <Button label="Sair" variant="outline" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    position: 'relative',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 96,
  },
  themeSwitch: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    marginTop: 6,
    padding: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileInfo: {
    flex: 1,
  },
})
