import React, { useEffect } from 'react'
import { Appearance, View, ActivityIndicator, StyleSheet, LogBox } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Provider } from 'react-redux'
import * as Linking from 'expo-linking'
import {
  Fraunces_600SemiBold,
  Fraunces_800ExtraBold,
  useFonts as useFrauncesFonts,
} from '@expo-google-fonts/fraunces'
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts as useNunitoFonts,
} from '@expo-google-fonts/nunito'
import { store, useAppDispatch, useAppSelector } from './src/store'
import { hydrateAuthThunk, selectAuthHydrated } from './src/store/slices/authSlice'
import { systemThemeChanged } from './src/store/slices/uiSlice'
import { supabase } from './src/config/supabase'
import RootNavigator from './src/navigation/RootNavigator'

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
])

function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {}
  const parts = url.split(/[?#]/)

  if (parts.length < 2) return params

  parts.slice(1).forEach((part) => {
    part.split('&').forEach((pair) => {
      const [key, value] = pair.split('=')
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value)
      }
    })
  })

  return params
}

function handleDeepLink(url: string, dispatch: ReturnType<typeof useAppDispatch>) {
  if (!url) return

  console.log('Deep link recebido:', url)

  if (!url.includes('auth/callback') && !url.includes('access_token')) {
    return
  }

  const params = extractParamsFromUrl(url)
  if (!params.access_token || !params.refresh_token) {
    return
  }

  supabase.auth
    .setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    })
    .then(({ error }) => {
      if (error) {
        console.log('Falha ao aplicar sessao via deep link:', error.message)
        return
      }

      dispatch(hydrateAuthThunk())
    })
}

// Componente separado porque precisa estar DENTRO do Provider
// para poder usar os hooks do Redux
function AppContent() {
  const dispatch = useAppDispatch()
  const hydrated = useAppSelector(selectAuthHydrated)
  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_600SemiBold,
    Fraunces_800ExtraBold,
  })
  const [nunitoLoaded] = useNunitoFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

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

  // Captura deep links quando o app ja esta aberto
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, dispatch)
    })

    return () => sub.remove()
  }, [dispatch])

  // Captura deep link inicial quando o app abre via link
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, dispatch)
      }
    })
  }, [dispatch])

  // Enquanto lê o Keychain, mostra loading (evita flash de tela de login)
  if (!hydrated || !frauncesLoaded || !nunitoLoaded) {
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