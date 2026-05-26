import axios from 'axios'
import { Platform } from 'react-native'
import { readAuthTokens, writeAuthTokens } from '../utils/authStorage'

type AuthInterceptorHandlers = {
  onTokenRefresh?: (accessToken: string) => void
  onAuthFailure?: () => void
}

let authHandlers: AuthInterceptorHandlers = {}
let _isOnline = true

export const setApiOnlineStatus = (online: boolean) => {
  _isOnline = online
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')

export const setApiAuthHandlers = (handlers: AuthInterceptorHandlers) => {
  authHandlers = handlers
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Bloqueia mutações quando offline
api.interceptors.request.use(async (config) => {
  const method = (config.method ?? 'GET').toUpperCase()
  if (!_isOnline && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const error = new Error('Sem internet. Conecte-se para continuar.')
    ;(error as any).isOffline = true
    throw error
  }
  // Injeta token em toda requisição
  const tokens = await readAuthTokens()
  if (tokens?.accessToken) {
    const { accessToken } = tokens
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  if (__DEV__) {
    const method = (config.method ?? 'GET').toUpperCase()
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`
    console.log(`[API] ${method} ${url}`)
  }

  return config
})

// Se 401, tenta refresh automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (__DEV__) {
      const status = error.response?.status ?? 'NETWORK'
      const method = (error.config?.method ?? 'GET').toUpperCase()
      const url = `${error.config?.baseURL ?? API_BASE_URL}${error.config?.url ?? ''}`
      console.log(`[API][ERROR] ${method} ${url} -> ${status}`)
    }

    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const tokens = await readAuthTokens()
        if (!tokens?.refreshToken) {
          throw new Error('Sem credenciais para refresh')
        }

        const { refreshToken } = tokens

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        await writeAuthTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })

        authHandlers.onTokenRefresh?.(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`

        return api(original) // retenta a requisição original
      } catch {
        authHandlers.onAuthFailure?.()
      }
    }

    throw error
  }
)