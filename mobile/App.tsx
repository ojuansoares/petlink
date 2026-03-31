import React, { useEffect } from 'react'
import { Appearance, View, ActivityIndicator, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Provider } from 'react-redux'
import { store, useAppDispatch, useAppSelector } from './src/store'
import { hydrateAuthThunk, selectAuthHydrated } from './src/store/slices/authSlice'
import { systemThemeChanged } from './src/store/slices/uiSlice'
import RootNavigator from './src/navigation/RootNavigator'

// Componente separado porque precisa estar DENTRO do Provider
// para poder usar os hooks do Redux
function AppContent() {
  const dispatch = useAppDispatch()
  const hydrated = useAppSelector(selectAuthHydrated)

  // Lê o Keychain e restaura a sessão ao abrir o app
  useEffect(() => {
    dispatch(hydrateAuthThunk())
  }, [dispatch])

  // Escuta mudança de tema do sistema (RF23 — modo escuro automático)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      dispatch(systemThemeChanged(colorScheme === 'dark' ? 'dark' : 'light'))
    })
    return () => sub.remove()
  }, [dispatch])

  // Enquanto lê o Keychain, mostra loading (evita flash de tela de login)
  if (!hydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  )
}

// Provider envolve tudo — sem ele os hooks do Redux não funcionam
export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})