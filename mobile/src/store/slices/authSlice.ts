import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { api } from '../../api/axios'
import { isSupabaseConfigured, supabase } from '../../config/supabase'
import { getServerRedirectUrl } from '../../services/AuthDeepLinkService'
import {
  isBiometricEnabled,
  isBiometricSessionLocked,
  setBiometricSessionLocked,
} from '../../services/BiometricService'
import { clearAuthTokens, readAuthTokens, writeAuthTokens } from '../../utils/authStorage'
import { ProfileOfflineRepository } from '../../data/repositories/ProfileOfflineRepository'

const CACHED_USER_KEY = 'petlink_cached_user'

async function writeCachedUser(user: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(CACHED_USER_KEY, JSON.stringify(user))
  } catch {
    // ignore cache failures
  }
}

async function readCachedUser(): Promise<any | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHED_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function clearCachedUser(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CACHED_USER_KEY)
  } catch {
    // ignore
  }
}

// ─── Types ───────────────────────────────────────────────────
export interface AuthUser {
  id:        string
  email:     string
  name:      string
  avatarUrl: string | null
  location:  string | null
}

interface AuthState {
  user:                AuthUser | null
  accessToken:         string | null
  isLoading:           boolean
  loadingContext:      'login' | 'logout' | 'register' | 'hydrate' | 'forgotPassword' | null
  isRefreshing:        boolean
  error:               string | null
  hydrated:            boolean  // true depois que lemos o Keychain na inicialização
  isPasswordResetFlow: boolean  // true durante fluxo de recuperação de senha
}

const toAuthUser = (user: { id: string; email: string; name?: string; avatarUrl?: string | null; location?: string | null }): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name ?? user.email.split('@')[0] ?? 'Usuario',
  avatarUrl: user.avatarUrl ?? null,
  location: user.location ?? null,
})

// ─── Thunks ──────────────────────────────────────────────────
export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    payload: { email: string; password: string; name: string; location: string; birthDate: string },
    { rejectWithValue }
  ) => {
    try {
      const redirectTo = getRedirectUrl()
      const { data } = await api.post('/auth/register', { ...payload, redirectTo })
      return data
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) {
          return rejectWithValue(message)
        }
      }

      return rejectWithValue('Erro ao cadastrar')
    }
  }
)

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', payload)

      await writeAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      await writeCachedUser(data.user)

      // Sync Supabase Client session
      await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
      })

      return data
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          return rejectWithValue('Nao foi possivel conectar ao servidor')
        }

        const message = err.response.data?.error ?? err.response.data?.message
        if (message) {
          return rejectWithValue(message)
        }

        if (err.response.status === 401 || err.response.status === 403) {
          return rejectWithValue('Credenciais invalidas')
        }
      }

      return rejectWithValue('Falha ao realizar login')
    }
  }
)

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  const biometricEnabled = await isBiometricEnabled()

  if (biometricEnabled) {
    await setBiometricSessionLocked(true)
    return
  }

  try {
    await api.post('/auth/logout')
  } finally {
    await clearAuthTokens()
    await clearCachedUser()
    await ProfileOfflineRepository.clearCache()
    await setBiometricSessionLocked(false)
  }
})

// Hidrata o estado na abertura do app lendo o Keychain
export const hydrateAuthThunk = createAsyncThunk(
  'auth/hydrate',
  async (_, { rejectWithValue }) => {
    try {
      const locked = await isBiometricSessionLocked()
      if (locked) return null

      const tokens = await readAuthTokens()
      if (!tokens) return null

      const { accessToken } = tokens

      try {
        // Valida sessão online quando houver conectividade.
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000,
        })

        await writeCachedUser(data.user)
        
        // Sync Supabase Client session
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: tokens.refreshToken,
        })

        return { accessToken, user: data.user }
      } catch (networkErr: any) {
        const status = networkErr?.response?.status

        if (status === 401 || status === 403) {
          await clearAuthTokens()
          await clearCachedUser()
          return rejectWithValue(null)
        }

        const cachedUser = await readCachedUser()
        if (cachedUser) {
          return { accessToken, user: cachedUser }
        }

        return rejectWithValue(null)
      }
    } catch {
      return rejectWithValue(null)
    }
  }
)

export const refreshTokenThunk = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      await setBiometricSessionLocked(false)

      const tokens = await readAuthTokens()
      if (!tokens?.refreshToken) return rejectWithValue('Sem token')

      const { refreshToken } = tokens
      const { data } = await api.post('/auth/refresh', { refreshToken })

      await writeAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      await writeCachedUser(data.user)

      // Sync Supabase Client session
      await supabase.auth.setSession({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
      })

      return data
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        await clearAuthTokens()
        await clearCachedUser()
        await ProfileOfflineRepository.clearCache()
      }

      return rejectWithValue('Refresh inválido')
    }
  }
)

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      if (!isSupabaseConfigured) {
        return rejectWithValue('Configuracao ausente no APK: EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getServerRedirectUrl(),
      })

      if (error) {
        console.log('[SUPABASE][RESET_PASSWORD][ERROR]', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          code: (error as any).code,
        })

        if (error.message.toLowerCase().includes('error sending confirmation email')) {
          return rejectWithValue('Erro ao enviar email de confirmacao. Verifique SMTP/Auth Logs no Supabase.')
        }

        return rejectWithValue(error.message)
      }

      return { sent: true }
    } catch {
      return rejectWithValue('Erro ao enviar email')
    }
  }
)

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async (password: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return rejectWithValue(error.message)
      await supabase.auth.signOut()
      return { success: true }
    } catch {
      return rejectWithValue('Erro ao redefinir senha')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: AuthState = {
  user:                null,
  accessToken:         null,
  isLoading:           false,
  loadingContext:      null,
  isRefreshing:        false,
  error:               null,
  hydrated:            false,
  isPasswordResetFlow: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null },

    setTokens: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken
    },

    setSession: (state, action: PayloadAction<{ user: AuthUser; accessToken?: string | null }>) => {
      state.user = action.payload.user
      if (action.payload.accessToken) {
        state.accessToken = action.payload.accessToken
      }
      state.error = null
    },

    logout: (state) => {
      state.user        = null
      state.accessToken = null
      state.error       = null
    },

    setPasswordResetFlow: (state, action: PayloadAction<boolean>) => {
      state.isPasswordResetFlow = action.payload
    },
  },
  extraReducers: (builder) => {
    // ── register ──
    builder
      .addCase(registerThunk.pending,   (s) => { s.isLoading = true; s.loadingContext = 'register'; s.error = null })
      .addCase(registerThunk.fulfilled, (s) => { s.isLoading = false; s.loadingContext = null })
      .addCase(registerThunk.rejected,  (s, a) => { s.isLoading = false; s.loadingContext = null; s.error = a.payload as string })

    // ── login ──
    builder
      .addCase(loginThunk.pending,   (s) => { s.isLoading = true; s.loadingContext = 'login'; s.error = null })
      .addCase(loginThunk.fulfilled, (s, a) => {
        s.isLoading   = false
        s.loadingContext = null
        s.accessToken = a.payload.accessToken
        s.user        = toAuthUser(a.payload.user)
      })
      .addCase(loginThunk.rejected, (s, a) => { s.isLoading = false; s.loadingContext = null; s.error = a.payload as string })

    // ── logout ──
    builder
      .addCase(logoutThunk.pending, (s) => { s.isLoading = true; s.loadingContext = 'logout' })
      .addCase(logoutThunk.fulfilled, (s) => {
        s.isLoading = false
        s.loadingContext = null
        s.user = null
        s.accessToken = null
      })
      .addCase(logoutThunk.rejected, (s) => {
        s.isLoading = false
        s.loadingContext = null
      })

    // ── hydrate ──
    builder
      .addCase(hydrateAuthThunk.pending,   (s) => { s.isLoading = true; s.loadingContext = 'hydrate' })
      .addCase(hydrateAuthThunk.fulfilled, (s, a) => {
        s.isLoading  = false
        s.loadingContext = null
        s.hydrated   = true
        if (a.payload) {
          s.accessToken = a.payload.accessToken
          s.user        = toAuthUser(a.payload.user)
        }
      })
      .addCase(hydrateAuthThunk.rejected, (s) => { s.isLoading = false; s.loadingContext = null; s.hydrated = true })

    // ── refresh ──
    builder
      .addCase(refreshTokenThunk.pending,   (s) => { s.isRefreshing = true })
      .addCase(refreshTokenThunk.fulfilled, (s, a) => {
        s.isRefreshing = false
        s.accessToken  = a.payload.accessToken
      })
      .addCase(refreshTokenThunk.rejected, (s) => {
        s.isRefreshing = false
        s.user         = null
        s.accessToken  = null
      })

    // ── forgot password ──
    builder
      .addCase(forgotPasswordThunk.pending,   (s) => { s.isLoading = true; s.loadingContext = 'forgotPassword'; s.error = null })
      .addCase(forgotPasswordThunk.fulfilled, (s) => { s.isLoading = false; s.loadingContext = null })
      .addCase(forgotPasswordThunk.rejected,  (s, a) => { s.isLoading = false; s.loadingContext = null; s.error = a.payload as string })

    // ── reset password ──
    builder
      .addCase(resetPasswordThunk.pending,   (s) => { s.isLoading = true; s.loadingContext = 'forgotPassword'; s.error = null })
      .addCase(resetPasswordThunk.fulfilled, (s) => { s.isLoading = false; s.loadingContext = null; s.isPasswordResetFlow = false })
      .addCase(resetPasswordThunk.rejected,  (s, a) => { s.isLoading = false; s.loadingContext = null; s.error = a.payload as string })
  },
})

export const { clearError, setTokens, setSession, logout, setPasswordResetFlow } = authSlice.actions
export default authSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectUser         = (s: any) => s.auth.user
export const selectIsAuth       = (s: any) => !!s.auth.user
export const selectAuthLoading  = (s: any) => s.auth.isLoading
export const selectAuthLoadingContext = (s: any) => s.auth.loadingContext
export const selectAuthError    = (s: any) => s.auth.error
export const selectAuthHydrated = (s: any) => s.auth.hydrated
export const selectIsPasswordResetFlow = (s: any) => s.auth.isPasswordResetFlow