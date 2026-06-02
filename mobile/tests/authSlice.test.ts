import { configureStore } from '@reduxjs/toolkit'
import authReducer, {
  registerThunk,
  loginThunk,
  logoutThunk,
  hydrateAuthThunk,
  refreshTokenThunk,
  forgotPasswordThunk,
  resetPasswordThunk,
  clearError,
  setTokens,
  setSession,
  logout,
  setPasswordResetFlow,
} from '../src/store/slices/authSlice'

const mockUser = { id: 'u1', email: 'test@test.com', name: 'Test', avatarUrl: null, location: 'BR' }
const mockLoginData = { accessToken: 'tok', refreshToken: 'rtok', user: mockUser }

jest.mock('../src/api/axios', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

jest.mock('../src/services/AuthDeepLinkService', () => ({
  getRedirectUrl: jest.fn(() => 'https://example.com/auth'),
  getServerRedirectUrl: jest.fn(() => 'https://example.com/auth/server'),
}))

jest.mock('../src/services/BiometricService', () => ({
  isBiometricEnabled: jest.fn(),
  isBiometricSessionLocked: jest.fn(),
  setBiometricSessionLocked: jest.fn(),
}))

jest.mock('../src/utils/authStorage', () => ({
  readAuthTokens: jest.fn(),
  writeAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn(),
}))

jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
    },
  },
  isSupabaseConfigured: true,
}))

jest.mock('../src/data/repositories/ProfileOfflineRepository', () => ({
  ProfileOfflineRepository: {
    clearCache: jest.fn(),
  },
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

const { api } = require('../src/api/axios')
const { supabase } = require('../src/config/supabase')
const { readAuthTokens, writeAuthTokens, clearAuthTokens } = require('../src/utils/authStorage')
const { isBiometricEnabled, isBiometricSessionLocked, setBiometricSessionLocked } = require('../src/services/BiometricService')

function createStore() {
  return configureStore({ reducer: { auth: authReducer } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('authSlice', () => {
  it('should return initial state', () => {
    const store = createStore()
    expect(store.getState().auth).toEqual({
      user: null,
      accessToken: null,
      isLoading: false,
      loadingContext: null,
      isRefreshing: false,
      error: null,
      hydrated: false,
      isPasswordResetFlow: false,
    })
  })

  describe('reducers', () => {
    it('clearError', () => {
      const store = createStore()
      store.dispatch({ type: 'auth/login/rejected', payload: 'invalid' })
      expect(store.getState().auth.error).toBe('invalid')
      store.dispatch(clearError())
      expect(store.getState().auth.error).toBeNull()
    })

    it('setTokens', () => {
      const store = createStore()
      store.dispatch(setTokens({ accessToken: 'new-tok' }))
      expect(store.getState().auth.accessToken).toBe('new-tok')
    })

    it('setSession', () => {
      const store = createStore()
      store.dispatch(setSession({ user: mockUser, accessToken: 'tok' }))
      const s = store.getState().auth
      expect(s.user).toEqual(mockUser)
      expect(s.accessToken).toBe('tok')
      expect(s.error).toBeNull()
    })

    it('logout clears user and token', () => {
      const store = createStore()
      store.dispatch(setSession({ user: mockUser, accessToken: 'tok' }))
      store.dispatch(logout())
      const s = store.getState().auth
      expect(s.user).toBeNull()
      expect(s.accessToken).toBeNull()
    })

    it('setPasswordResetFlow', () => {
      const store = createStore()
      store.dispatch(setPasswordResetFlow(true))
      expect(store.getState().auth.isPasswordResetFlow).toBe(true)
    })
  })

  describe('registerThunk', () => {
    it('should call API and succeed', async () => {
      api.post.mockResolvedValue({ data: { id: 'u1' } })

      const store = createStore()
      const r = await store.dispatch(registerThunk({ email: 'a@b.com', password: '123', name: 'A', location: 'BR', birthDate: '2000-01-01' }))

      expect(r.meta.requestStatus).toBe('fulfilled')
      expect(store.getState().auth.isLoading).toBe(false)
    })

    it('should handle API error', async () => {
      api.post.mockRejectedValue({ isAxiosError: true, response: { data: { error: 'email taken' } } })

      const store = createStore()
      await store.dispatch(registerThunk({ email: 'a@b.com', password: '123', name: 'A', location: 'BR', birthDate: '2000-01-01' }))

      expect(store.getState().auth.error).toBe('email taken')
    })
  })

  describe('loginThunk', () => {
    it('should login, store tokens, sync supabase', async () => {
      api.post.mockResolvedValue({ data: mockLoginData })

      const store = createStore()
      await store.dispatch(loginThunk({ email: 'test@test.com', password: '123' }))

      const s = store.getState().auth
      expect(s.isLoading).toBe(false)
      expect(s.user).toEqual(mockUser)
      expect(s.accessToken).toBe('tok')
      expect(writeAuthTokens).toHaveBeenCalledWith({ accessToken: 'tok', refreshToken: 'rtok' })
      expect(supabase.auth.setSession).toHaveBeenCalledWith({ access_token: 'tok', refresh_token: 'rtok' })
    })

    it('should handle 401', async () => {
      api.post.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })

      const store = createStore()
      await store.dispatch(loginThunk({ email: 'test@test.com', password: 'wrong' }))

      expect(store.getState().auth.error).toBe('Credenciais invalidas')
    })

    it('should handle network error', async () => {
      api.post.mockRejectedValue({ isAxiosError: true, response: undefined })

      const store = createStore()
      await store.dispatch(loginThunk({ email: 'test@test.com', password: '123' }))

      expect(store.getState().auth.error).toBe('Nao foi possivel conectar ao servidor')
    })
  })

  describe('logoutThunk', () => {
    it('should lock biometric session when enabled', async () => {
      isBiometricEnabled.mockResolvedValue(true)

      const store = createStore()
      await store.dispatch(logoutThunk())

      expect(setBiometricSessionLocked).toHaveBeenCalledWith(true)
    })

    it('should clear everything when biometric not enabled', async () => {
      isBiometricEnabled.mockResolvedValue(false)
      api.post.mockResolvedValue({})

      const store = createStore()
      await store.dispatch(logoutThunk())

      expect(clearAuthTokens).toHaveBeenCalled()
    })
  })

  describe('hydrateAuthThunk', () => {
    it('should return null when biometric session locked', async () => {
      isBiometricSessionLocked.mockResolvedValue(true)

      const store = createStore()
      await store.dispatch(hydrateAuthThunk())

      const s = store.getState().auth
      expect(s.hydrated).toBe(true)
      expect(s.user).toBeNull()
    })

    it('should return null when no tokens', async () => {
      isBiometricSessionLocked.mockResolvedValue(false)
      readAuthTokens.mockResolvedValue(null)

      const store = createStore()
      await store.dispatch(hydrateAuthThunk())

      expect(store.getState().auth.hydrated).toBe(true)
    })

    it('should restore session from valid tokens', async () => {
      isBiometricSessionLocked.mockResolvedValue(false)
      readAuthTokens.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' })
      api.get.mockResolvedValue({ data: { user: mockUser } })

      const store = createStore()
      await store.dispatch(hydrateAuthThunk())

      const s = store.getState().auth
      expect(s.user).toEqual(mockUser)
      expect(s.accessToken).toBe('tok')
      expect(s.hydrated).toBe(true)
    })

    it('should fallback to cached user on network error', async () => {
      isBiometricSessionLocked.mockResolvedValue(false)
      readAuthTokens.mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' })
      api.get.mockRejectedValue({ response: { status: 500 } })
      const SecureStore = require('expo-secure-store')
      SecureStore.getItemAsync.mockImplementation((key: string) => {
        if (key === 'petlink_cached_user') return Promise.resolve(JSON.stringify(mockUser))
        return Promise.resolve(null)
      })

      const store = createStore()
      await store.dispatch(hydrateAuthThunk())

      const s = store.getState().auth
      expect(s.user).toEqual(mockUser)
      expect(s.accessToken).toBe('tok')
    })
  })

  describe('refreshTokenThunk', () => {
    it('should refresh tokens', async () => {
      readAuthTokens.mockResolvedValue({ accessToken: 'old', refreshToken: 'rtok' })
      api.post.mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'new-rtok', user: mockUser } })

      const store = createStore()
      await store.dispatch(refreshTokenThunk())

      const s = store.getState().auth
      expect(s.isRefreshing).toBe(false)
      expect(s.accessToken).toBe('new')
    })

    it('should clear tokens on 401', async () => {
      readAuthTokens.mockResolvedValue({ accessToken: 'old', refreshToken: 'rtok' })
      api.post.mockRejectedValue({ response: { status: 401 } })

      const store = createStore()
      await store.dispatch(refreshTokenThunk())

      const s = store.getState().auth
      expect(s.accessToken).toBeNull()
      expect(s.user).toBeNull()
    })
  })

  describe('forgotPasswordThunk', () => {
    it('should send reset email', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })

      const store = createStore()
      const r = await store.dispatch(forgotPasswordThunk('test@test.com'))

      expect(r.meta.requestStatus).toBe('fulfilled')
    })

    it('should handle supabase error', async () => {
      supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'invalid email' } })

      const store = createStore()
      await store.dispatch(forgotPasswordThunk('bad'))

      expect(store.getState().auth.error).toBe('invalid email')
    })
  })

  describe('resetPasswordThunk', () => {
    it('should update password and sign out', async () => {
      supabase.auth.updateUser.mockResolvedValue({ error: null })
      supabase.auth.signOut.mockResolvedValue({})

      const store = createStore()
      const r = await store.dispatch(resetPasswordThunk('newpass'))

      expect(r.meta.requestStatus).toBe('fulfilled')
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })
  })
})
