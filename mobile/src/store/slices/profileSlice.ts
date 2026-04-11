import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../../api/axios'
import { ProfileOfflineRepository, type OfflineUserProfile } from '../../data/repositories/ProfileOfflineRepository'
import { logout, logoutThunk } from './authSlice'

export interface UserProfile extends OfflineUserProfile {}

interface ProfileState {
  profile: UserProfile | null
  isLoading: boolean
  isUpdating: boolean
  error: string | null
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  isUpdating: false,
  error: null,
}

export const fetchMyProfileThunk = createAsyncThunk(
  'profile/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/profile/me')
      const profile = data.profile as UserProfile
      await ProfileOfflineRepository.replaceFromRemote(profile)
      return profile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status

        if (status === 401 || status === 403) {
          await ProfileOfflineRepository.clearCache()
          const message = err.response?.data?.error ?? err.response?.data?.message
          return rejectWithValue(message ?? 'Nao autenticado')
        }

        const cached = await ProfileOfflineRepository.getCachedProfile()
        if (cached) return cached

        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }

      const cached = await ProfileOfflineRepository.getCachedProfile()
      if (cached) return cached

      return rejectWithValue('Erro ao carregar perfil')
    }
  }
)

export const updateMyProfileThunk = createAsyncThunk(
  'profile/updateMe',
  async (
    payload: { name: string; location: string; avatar_url: string; bio: string; birth_date?: string },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        name: payload.name.trim(),
        location: payload.location.trim(),
        avatar_url: payload.avatar_url.trim(),
        bio: payload.bio.trim(),
        ...(payload.birth_date ? { birth_date: payload.birth_date } : {}),
      }

      const { data } = await api.put('/profile/me', body)
      const profile = data.profile as UserProfile
      await ProfileOfflineRepository.replaceFromRemote(profile)
      return profile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao atualizar perfil')
    }
  }
)

export const updateMyAvatarThunk = createAsyncThunk(
  'profile/updateAvatar',
  async (payload: { avatar_url: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/profile/me', {
        avatar_url: payload.avatar_url.trim(),
      })
      const profile = data.profile as UserProfile
      await ProfileOfflineRepository.replaceFromRemote(profile)
      return profile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao atualizar foto de perfil')
    }
  }
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfileThunk.pending, (s) => {
        s.isLoading = true
        s.error = null
      })
      .addCase(fetchMyProfileThunk.fulfilled, (s, a) => {
        s.isLoading = false
        s.profile = a.payload
      })
      .addCase(fetchMyProfileThunk.rejected, (s, a) => {
        s.isLoading = false
        s.error = (a.payload as string) ?? 'Erro ao carregar perfil'
      })

    builder
      .addCase(updateMyProfileThunk.pending, (s) => {
        s.isUpdating = true
        s.error = null
      })
      .addCase(updateMyProfileThunk.fulfilled, (s, a) => {
        s.isUpdating = false
        s.profile = a.payload
      })
      .addCase(updateMyProfileThunk.rejected, (s, a) => {
        s.isUpdating = false
        s.error = (a.payload as string) ?? 'Erro ao atualizar perfil'
      })

    builder
      .addCase(updateMyAvatarThunk.pending, (s) => {
        s.isUpdating = true
        s.error = null
      })
      .addCase(updateMyAvatarThunk.fulfilled, (s, a) => {
        s.isUpdating = false
        s.profile = a.payload
      })
      .addCase(updateMyAvatarThunk.rejected, (s, a) => {
        s.isUpdating = false
        s.error = (a.payload as string) ?? 'Erro ao atualizar foto de perfil'
      })

    builder
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(logout, () => initialState)
  },
})

export default profileSlice.reducer

export const selectProfile = (s: any) => s.profile.profile as UserProfile | null
export const selectProfileLoading = (s: any) => s.profile.isLoading as boolean
export const selectProfileUpdating = (s: any) => s.profile.isUpdating as boolean
export const selectProfileError = (s: any) => s.profile.error as string | null
