import axios from 'axios'
import * as Keychain from 'react-native-keychain'
import { store } from '../store'
import { logout, setTokens } from '../store/slices/authSlice'

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
})

// Injeta token em toda requisição
api.interceptors.request.use(async (config) => {
  const credentials = await Keychain.getGenericPassword()
  if (credentials) {
    const { accessToken } = JSON.parse(credentials.password)
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Se 401, tenta refresh automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const credentials = await Keychain.getGenericPassword()
        const { refreshToken } = JSON.parse(credentials!.password)

        const { data } = await axios.post('http://localhost:3000/auth/refresh', {
          refreshToken,
        })

        // Salva novos tokens no Keychain (nunca AsyncStorage)
        await Keychain.setGenericPassword(
          'petlink',
          JSON.stringify({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          })
        )

        store.dispatch(setTokens(data))
        original.headers.Authorization = `Bearer ${data.accessToken}`

        return api(original) // retenta a requisição original
      } catch {
        store.dispatch(logout())
      }
    }

    return Promise.reject(error)
  }
)