import React, { useEffect } from 'react'
import { Appearance, View, Text, ActivityIndicator, StyleSheet, LogBox, Image } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Provider } from 'react-redux'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import { selectIsDark, systemThemeChanged } from './src/store/slices/uiSlice'
import { supabase } from './src/config/supabase'
import RootNavigator from './src/navigation/RootNavigator'
import { tokens, withAlpha } from './src/theme'
import OnboardingScreen, { OnboardingStep } from './src/screens/OnboardingScreen'

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
])

const ONBOARDING_SEEN_KEY = 'petlink.onboarding.seen'

const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    title: 'Bem-vindo ao PetLink',
    description: 'Aqui voce organiza o cuidado dos seus pets de forma simples e rapida.',
  },
  {
    title: 'Cadastre seu perfil',
    description: 'No primeiro acesso, crie sua conta e confirme o email para liberar o uso completo.',
  },
  {
    title: 'Registre seus pets',
    description: 'Adicione cada pet e mantenha as informacoes principais sempre acessiveis.',
  },
  {
    title: 'Ative recursos do app',
    description: 'Use notificacoes, localizacao e outras funcoes para acompanhar melhor a rotina.',
  },
]

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

function handleDeepLink(
  url: string,
  dispatch: ReturnType<typeof useAppDispatch>,
  onMessage?: (message: string) => void
) {
  if (!url) return

  console.log('Deep link recebido:', url)

  if (!url.includes('auth/callback') && !url.includes('access_token')) {
    return
  }

  const params = extractParamsFromUrl(url)
  if (!params.access_token || !params.refresh_token) {
    return
  }

  const linkType = params.type?.toLowerCase()
  const isEmailConfirmation = linkType === 'signup' || linkType === 'email_change'

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

      if (isEmailConfirmation) {
        onMessage?.('Email confirmado com sucesso! Agora voce ja pode usar o app.')
      }

      dispatch(hydrateAuthThunk())
    })
}

// Componente separado porque precisa estar DENTRO do Provider
// para poder usar os hooks do Redux
function AppContent() {
  const dispatch = useAppDispatch()
  const hydrated = useAppSelector(selectAuthHydrated)
  const isDark = useAppSelector(selectIsDark)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const [showLaunchSplash, setShowLaunchSplash] = React.useState(true)
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null)
  const [onboardingStep, setOnboardingStep] = React.useState(0)
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
      handleDeepLink(url, dispatch, setToastMessage)
    })

    return () => sub.remove()
  }, [dispatch])

  // Captura deep link inicial quando o app abre via link
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, dispatch, setToastMessage)
      }
    })
  }, [dispatch])

  useEffect(() => {
    if (!toastMessage) return

    const timer = setTimeout(() => setToastMessage(null), 3500)
    return () => clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLaunchSplash(false)
    }, 2200)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((value) => {
        setHasSeenOnboarding(value === '1')
      })
      .catch(() => {
        setHasSeenOnboarding(false)
      })
  }, [])

  // Enquanto lê o Keychain, mostra loading (evita flash de tela de login)
  if (showLaunchSplash || !hydrated || !frauncesLoaded || !nunitoLoaded || hasSeenOnboarding === null) {
    const splashPalette = isDark ? tokens.dark : tokens.light

    return (
      <View style={[styles.splash, { backgroundColor: splashPalette.background }]}>
        <Image source={require('./src/assets/icon.png')} style={styles.splashLogo} resizeMode="contain" />
        <ActivityIndicator size="small" color={splashPalette.primary} style={styles.splashLoader} />
        <StatusBar style="auto" />
      </View>
    )
  }

  const palette = isDark ? tokens.dark : tokens.light

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    setHasSeenOnboarding(true)
  }

  const goNextOnboardingStep = () => {
    if (onboardingStep >= ONBOARDING_STEPS.length - 1) return
    setOnboardingStep((value) => value + 1)
  }

  const isOnboardingActive = hasSeenOnboarding === false

  return (
    <>
      <StatusBar style="auto" />
      {isOnboardingActive ? (
        <OnboardingScreen
          palette={palette}
          steps={ONBOARDING_STEPS}
          currentIndex={onboardingStep}
          onNext={goNextOnboardingStep}
          onComplete={completeOnboarding}
        />
      ) : (
        <RootNavigator />
      )}

      {toastMessage ? (
        <View style={styles.toastContainer} pointerEvents="none">
          <View
            style={[
              styles.toastBox,
              {
                backgroundColor: palette.primary,
                borderColor: withAlpha(palette.border, 0.9),
              },
            ]}
          >
            <ActivityIndicator size="small" color={palette.primaryForeground} style={styles.toastSpinner} />
            <View style={styles.toastTextWrapper}>
              <Text style={[styles.toastTitle, { color: palette.primaryForeground }]}>Confirmacao concluida</Text>
              <Text style={[styles.toastMessage, { color: palette.primaryForeground }]}>{toastMessage}</Text>
            </View>
          </View>
        </View>
      ) : null}
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
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 132,
    height: 132,
  },
  splashLoader: {
    marginTop: 18,
  },
  toastContainer: {
    position: 'absolute',
    top: 58,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toastBox: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastSpinner: {
    marginRight: 10,
  },
  toastTextWrapper: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
})