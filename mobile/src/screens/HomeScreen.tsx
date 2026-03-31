import React from 'react'
import { Button, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAppDispatch, useAppSelector } from '../store'
import { logout, logoutThunk, selectUser } from '../store/slices/authSlice'
import { selectIsDark, toggleTheme } from '../store/slices/uiSlice'

export default function HomeScreen() {
  const dispatch = useAppDispatch()
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
    <View style={styles.container}>
      <Pressable style={styles.themeSwitch} onPress={() => dispatch(toggleTheme())}>
        <Text style={styles.themeSwitchText}>{isDark ? '☀️' : '🌙'}</Text>
      </Pressable>
      <Text style={styles.title}>Home</Text>
      {user?.email ? <Text>{user.email}</Text> : null}
      <Button title="Sair" onPress={handleLogout} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    position: 'relative',
  },
  themeSwitch: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  themeSwitchText: {
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
})
