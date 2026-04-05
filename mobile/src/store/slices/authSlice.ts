import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../../api/axios'
import { supabase } from '../../config/supabase'
import { getRedirectUrl } from '../../services/AuthDeepLinkService'
import { clearAuthTokens, readAuthTokens, writeAuthTokens } from '../../utils/authStorage'

// ─── Types ───────────────────────────────────────────────────
export interface AuthUser {
  id:        string
  email:     string
  name:      string
  avatarUrl: string | null
  location:  string | null
}

interface AuthState {
  user:         AuthUser | null
  accessToken:  string | null
  isLoading:    boolean
  isRefreshing: boolean
  error:        string | null
  hydrated:     boolean  // true depois que lemos o Keychain na inicialização
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
    payload: { email: string; password: string; name: string; location: string },
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
  try {
    await api.post('/auth/logout')
  } finally {
    await clearAuthTokens()
  }
})

// Hidrata o estado na abertura do app lendo o Keychain
export const hydrateAuthThunk = createAsyncThunk(
  'auth/hydrate',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = await readAuthTokens()
      if (!tokens) return null

      const { accessToken } = tokens

      // Busca dados atuais do usuário
      const { data } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      return { accessToken, user: data.user }
    } catch {
      await clearAuthTokens()
      return rejectWithValue(null)
    }
  }
)

export const refreshTokenThunk = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = await readAuthTokens()
      if (!tokens?.refreshToken) return rejectWithValue('Sem token')

      const { refreshToken } = tokens
      const { data } = await api.post('/auth/refresh', { refreshToken })

      await writeAuthTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })

      return data
    } catch {
      await clearAuthTokens()
      return rejectWithValue('Refresh inválido')
    }
  }
)

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRedirectUrl(),
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

// ─── Slice ───────────────────────────────────────────────────
const initialState: AuthState = {
  user:         null,
  accessToken:  null,
  isLoading:    false,
  isRefreshing: false,
  error:        null,
  hydrated:     false,
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
  },
  extraReducers: (builder) => {
    // ── register ──
    builder
      .addCase(registerThunk.pending,   (s) => { s.isLoading = true; s.error = null })
      .addCase(registerThunk.fulfilled, (s) => { s.isLoading = false })
      .addCase(registerThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string })

    // ── login ──
    builder
      .addCase(loginThunk.pending,   (s) => { s.isLoading = true; s.error = null })
      .addCase(loginThunk.fulfilled, (s, a) => {
        s.isLoading   = false
        s.accessToken = a.payload.accessToken
        s.user        = toAuthUser(a.payload.user)
      })
      .addCase(loginThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string })

    // ── logout ──
    builder
      .addCase(logoutThunk.fulfilled, (s) => { s.user = null; s.accessToken = null })

    // ── hydrate ──
    builder
      .addCase(hydrateAuthThunk.pending,   (s) => { s.isLoading = true })
      .addCase(hydrateAuthThunk.fulfilled, (s, a) => {
        s.isLoading  = false
        s.hydrated   = true
        if (a.payload) {
          s.accessToken = a.payload.accessToken
          s.user        = toAuthUser(a.payload.user)
        }
      })
      .addCase(hydrateAuthThunk.rejected, (s) => { s.isLoading = false; s.hydrated = true })

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
      .addCase(forgotPasswordThunk.pending,   (s) => { s.isLoading = true; s.error = null })
      .addCase(forgotPasswordThunk.fulfilled, (s) => { s.isLoading = false })
      .addCase(forgotPasswordThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string })
  },
})

export const { clearError, setTokens, setSession, logout } = authSlice.actions
export default authSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectUser         = (s: any) => s.auth.user
export const selectIsAuth       = (s: any) => !!s.auth.user
export const selectAuthLoading  = (s: any) => s.auth.isLoading
export const selectAuthError    = (s: any) => s.auth.error
export const selectAuthHydrated = (s: any) => s.auth.hydrated