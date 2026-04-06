import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../../api/axios'
import { logout, logoutThunk } from './authSlice'

export interface UserProfile {
  id: string
  name: string
  location: string | null
  created_at: string
  avatar_url: string | null
  bio: string | null
  updated_at: string | null
}

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
      return data.profile as UserProfile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao carregar perfil')
    }
  }
)

export const updateMyProfileThunk = createAsyncThunk(
  'profile/updateMe',
  async (
    payload: { name: string; location: string; avatar_url: string; bio: string },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        name: payload.name.trim(),
        location: payload.location.trim(),
        avatar_url: payload.avatar_url.trim(),
        bio: payload.bio.trim(),
      }

      const { data } = await api.put('/profile/me', body)
      return data.profile as UserProfile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao atualizar perfil')
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
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(logout, () => initialState)
  },
})

export default profileSlice.reducer

export const selectProfile = (s: any) => s.profile.profile as UserProfile | null
export const selectProfileLoading = (s: any) => s.profile.isLoading as boolean
export const selectProfileUpdating = (s: any) => s.profile.isUpdating as boolean
export const selectProfileError = (s: any) => s.profile.error as string | null
