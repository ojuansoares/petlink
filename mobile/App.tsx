import React, { useEffect } from 'react'
import { Appearance, View, Text, ActivityIndicator, StyleSheet, LogBox, Image, Dimensions, Animated, Easing } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Provider } from 'react-redux'
import * as Linking from 'expo-linking'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'
// Fraunces removida para um visual mais clean e "fofo" (sans-serif rounded)
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts as useNunitoFonts,
} from '@expo-google-fonts/nunito'
import { store, useAppDispatch, useAppSelector } from './src/store'
import {
  hydrateAuthThunk,
  selectAuthHydrated,
  selectAuthLoading,
  selectAuthLoadingContext,
  selectIsAuth,
  setPasswordResetFlow,
} from './src/store/slices/authSlice'
import { selectIsDark, systemThemeChanged, setOnline, showToast } from './src/store/slices/uiSlice'
import { hydrateActivePetThunk } from './src/store/slices/petsSlice'
import { api, setApiOnlineStatus } from './src/api/axios'
import { supabase } from './src/config/supabase'
import RootNavigator from './src/navigation/RootNavigator'
import { tokens, withAlpha } from './src/theme'
import OnboardingScreen, { OnboardingStep } from './src/screens/OnboardingScreen'
import { AppLoadingOverlay } from './src/components/ui/AppLoadingOverlay'
import { AppToast } from './src/components/ui/AppToast'
import LevelUpProvider from './src/components/LevelUpProvider'
import {
  configureNotifications,
  createNotificationChannel,
  requestNotificationPermission,
  getExpoPushToken,
  registerPushTokenOnServer,
  restoreScheduledNotifications,
  scheduleAllFromApi,
  setupNotificationCategories,
  addNotificationResponseReceivedListener,
  handleVaccineNotificationAction,
  handleFeedingNotificationAction,
} from './src/services/NotificationService'
import { navigateFromNotification } from './src/navigation/navigationRef'

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
])

if (__DEV__) {
  const originalWarn = console.warn

  console.warn = (...args: any[]) => {
    const firstArg = args[0]
    if (typeof firstArg === 'string' && firstArg.includes('InteractionManager has been deprecated')) {
      return
    }

    originalWarn(...args)
  }
}

const SPLASH_LOGO_SIZE = Math.round(Dimensions.get('window').width * 0.86)

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

function getAuthLoadingMessage(
  loadingContext: 'login' | 'logout' | 'register' | 'hydrate' | 'forgotPassword' | null
): string {
  if (loadingContext === 'login') return 'Bem-vindo'
  if (loadingContext === 'logout') return 'Ate mais'
  if (loadingContext === 'register') return 'Criando sua conta...'
  if (loadingContext === 'forgotPassword') return 'Enviando email...'
  return 'Carregando...'
}

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

async function handleDeepLink(
  url: string,
  dispatch: ReturnType<typeof useAppDispatch>
) {
  if (!url) return

  console.log('Deep link recebido:', url)

  if (!url.includes('auth/callback') && !url.includes('access_token') && !url.includes('token=')) {
    return
  }

  const params = extractParamsFromUrl(url)
  const linkType = params.type?.toLowerCase()

  // ── Fluxo via servidor bridge (recovery_code) ──
  // O servidor guardou os tokens no /auth/redirect e nos mandou um código.
  // Buscamos os tokens pelo código e aplicamos a sessão.
  if (params.recovery_code) {
    try {
      const { data } = await api.get(`/auth/recovery-session?code=${encodeURIComponent(params.recovery_code)}`)
      const { accessToken, refreshToken } = data
      if (!accessToken || !refreshToken) return

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.log('Falha ao aplicar sessao recovery:', error.message)
        return
      }
      dispatch(setPasswordResetFlow(true))
      dispatch(showToast({ type: 'success', title: 'Recuperação', message: 'Token de recuperação validado. Defina sua nova senha.' }))
    } catch (err) {
      console.log('Erro ao buscar sessao recovery:', err)
    }
    return
  }

  // ── Fluxo direto (token + email no deep link, sem passar pelo navegador) ──
  if (params.token && params.email && linkType === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'recovery',
    })
    if (error) {
      console.log('Falha ao verificar token de recuperacao:', error.message)
      return
    }
    dispatch(setPasswordResetFlow(true))
    dispatch(showToast({ type: 'success', message: 'Token de recuperação validado. Defina sua nova senha.' }))
    return
  }

  // ── Fluxo tradicional (via Supabase verify page + redirect com access_token) ──
  if (!params.access_token || !params.refresh_token) return

  const isEmailConfirmation = linkType === 'signup' || linkType === 'email_change'
  const isRecovery = linkType === 'recovery'

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
        dispatch(showToast({ type: 'success', title: 'Email confirmado', message: 'Email confirmado com sucesso! Agora voce ja pode usar o app.' }))
        dispatch(hydrateAuthThunk())
      }

      if (isRecovery) {
        dispatch(setPasswordResetFlow(true))
        dispatch(showToast({ type: 'success', title: 'Recuperação', message: 'Token de recuperação validado. Defina sua nova senha.' }))
      }
    })
}

// Componente separado porque precisa estar DENTRO do Provider
// para poder usar os hooks do Redux
function AppContent() {
  const dispatch = useAppDispatch()
  const insets = useSafeAreaInsets()
  const hydrated = useAppSelector(selectAuthHydrated)
  const authLoading = useAppSelector(selectAuthLoading)
  const authLoadingContext = useAppSelector(selectAuthLoadingContext)
  const isAuth = useAppSelector(selectIsAuth)
  const isDark = useAppSelector(selectIsDark)
  const [showLaunchSplash, setShowLaunchSplash] = React.useState(true)
  const [connectionStatus, setConnectionStatus] = React.useState<'online' | 'offline'>('online')
  const [showConnectionBanner, setShowConnectionBanner] = React.useState(false)
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(null)
  const [onboardingStep, setOnboardingStep] = React.useState(0)
  const connectionBannerAnim = React.useRef(new Animated.Value(-56)).current
  const connectionHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastConnectionRef = React.useRef<boolean | null>(null)
  const [nunitoLoaded] = useNunitoFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  })

  // Consideramos carregado se o Nunito estiver pronto
  const fontsLoaded = nunitoLoaded

  // Lê o Keychain e restaura a sessão e o pet ativo ao abrir o app
  useEffect(() => {
    dispatch(hydrateAuthThunk())
    dispatch(hydrateActivePetThunk())
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

  // Removido useEffect de dismiss toasts pois agora vive no AppToast

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

  const showConnectivityBanner = React.useCallback((status: 'online' | 'offline') => {
    setConnectionStatus(status)
    setShowConnectionBanner(true)

    if (connectionHideTimerRef.current) {
      clearTimeout(connectionHideTimerRef.current)
      connectionHideTimerRef.current = null
    }

    Animated.timing(connectionBannerAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    connectionHideTimerRef.current = setTimeout(() => {
      Animated.timing(connectionBannerAnim, {
        toValue: -56,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowConnectionBanner(false)
        }
      })
    }, 3000)
  }, [connectionBannerAnim])

  useEffect(() => {
    const handleConnectivity = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      const isOnline = state.isConnected !== false && state.isInternetReachable !== false
      dispatch(setOnline(isOnline))
      setApiOnlineStatus(isOnline)

      if (lastConnectionRef.current === null) {
        lastConnectionRef.current = isOnline
        showConnectivityBanner(isOnline ? 'online' : 'offline')
        return
      }

      if (lastConnectionRef.current !== isOnline) {
        lastConnectionRef.current = isOnline
        showConnectivityBanner(isOnline ? 'online' : 'offline')
        if (isOnline) {
          const { feedingQueueRepository } = require('./src/data/repositories/FeedingQueueRepository')
          feedingQueueRepository.processQueue()
          const { vaccineCacheRepository } = require('./src/data/repositories/VaccineCacheRepository')
          vaccineCacheRepository.processQueue()
        }
      }
    }

    const unsubscribe = NetInfo.addEventListener(handleConnectivity)

    NetInfo.fetch()
      .then(handleConnectivity)
      .catch(() => {
        // ignore fetch error; listener remains active
      })

    return unsubscribe
  }, [dispatch, showConnectivityBanner])

  useEffect(() => {
    return () => {
      if (connectionHideTimerRef.current) {
        clearTimeout(connectionHideTimerRef.current)
      }
    }
  }, [])

  // Inicializa notificações push após auth hydration
  useEffect(() => {
    if (!hydrated || !isAuth) return

    const initPushNotifications = async () => {
      const pref = await AsyncStorage.getItem('petlink.notifications.enabled')
      if (pref === 'false') return

      configureNotifications()
      await createNotificationChannel()
      await setupNotificationCategories()

      const granted = await requestNotificationPermission()
      if (!granted) return

      const token = await getExpoPushToken()
      if (token) {
        await registerPushTokenOnServer(token)
      }

      await restoreScheduledNotifications()
      await scheduleAllFromApi()
    }

    initPushNotifications()

    const sub = addNotificationResponseReceivedListener((data, actionId, notificationId) => {
      if (actionId) {
        if (data.type === 'vaccine') {
          handleVaccineNotificationAction(actionId, data as Record<string, unknown>, notificationId)
        } else if (data.type === 'feeding') {
          handleFeedingNotificationAction(actionId, data as Record<string, unknown>, notificationId)
        }
        return
      }

      const navData = data as Record<string, unknown>
      const type = navData.type as string | undefined
      const screen = navData.screen as string | undefined

      if (type === 'vaccine' || type === 'vaccine_due') {
        const petId = navData.petId as string | undefined
        const petName = navData.petName as string | undefined
        const vaccineId = navData.vaccineId as string | undefined
        if (petId && petName) {
          navigateFromNotification('Vaccine', { petId, petName, vaccineId })
        }
      } else if (type === 'feeding') {
        const petId = navData.petId as string | undefined
        const petName = navData.petName as string | undefined
        if (petId && petName) {
          navigateFromNotification('FeedingPlan', { petId, petName })
        }
      } else if (screen === 'PublicProfile') {
        const userId = navData.userId as string | undefined
        if (userId) {
          navigateFromNotification('PublicProfile', { userId })
        }
      } else if (screen === 'Post') {
        const userId = navData.userId as string | undefined
        if (userId) {
          navigateFromNotification('PublicProfile', { userId })
        }
      }
    })

    return () => sub.remove()
  }, [hydrated, isAuth])

  // Enquanto lê o Keychain, mostra loading (evita flash de tela de login)
  if (showLaunchSplash || !hydrated || !fontsLoaded || hasSeenOnboarding === null) {
    const splashBackground = '#5D7052'

    return (
      <View style={[styles.splash, { backgroundColor: splashBackground }]}>
        <Image source={require('./src/assets/icon.png')} style={styles.splashLogo} resizeMode="contain" />
        <ActivityIndicator size="small" color="#F3F4F1" style={styles.splashLoader} />
        <StatusBar style="light" />
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

  const loadingMessage = getAuthLoadingMessage(authLoadingContext)
  const isOnlineBanner = connectionStatus === 'online'
  const connectionBackground = isOnlineBanner ? palette.primary : palette.destructive
  const connectionForeground = isOnlineBanner ? palette.primaryForeground : palette.destructiveForeground
  const connectionMessage = isOnlineBanner ? 'Conexao online' : 'Sem internet'

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {showConnectionBanner ? (
        <Animated.View
          style={[
            styles.connectionBanner,
            {
              top: insets.top + 4,
              backgroundColor: connectionBackground,
              borderColor: withAlpha(palette.border, 0.9),
              transform: [{ translateY: connectionBannerAnim }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.connectionBannerText, { color: connectionForeground }]}>{connectionMessage}</Text>
        </Animated.View>
      ) : null}
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

      <AppToast />

      <AppLoadingOverlay visible={authLoading && hydrated} message={loadingMessage} />

      <LevelUpProvider />
    </>
  )
}

// Provider envolve tudo — sem ele os hooks do Redux não funcionam
export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
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
    zIndex: 9999,
  },
  connectionBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  connectionBannerText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
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