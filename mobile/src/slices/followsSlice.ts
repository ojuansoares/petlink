import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../api/axios'

interface FollowsState {
  // Map of userId => boolean (whether current user follows this user)
  following: Record<string, boolean>
  loading: Record<string, boolean> // for follow/unfollow actions
  error: string | null
}

const initialState: FollowsState = {
  following: {},
  loading: {},
  error: null,
}

// Check if current user follows a given user
export const checkFollowStatusThunk = createAsyncThunk(
  'follows/checkStatus',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/follow/${userId}/status`)
      return { userId, isFollowing: data.isFollowing }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao verificar status de follow')
    }
  }
)

// Follow a user
export const followUserThunk = createAsyncThunk(
  'follows/follow',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/follow/${userId}`)
      // Assuming the API returns the updated profile of the followed user
      return data.profile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao seguir usuário')
    }
  }
)

// Unfollow a user
export const unfollowUserThunk = createAsyncThunk(
  'follows/unfollow',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/follow/${userId}`)
      // Assuming the API returns the updated profile of the followed user
      return data.profile
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao deixar de seguir usuário')
    }
  }
)

const followsSlice = createSlice({
  name: 'follows',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkFollowStatusThunk.pending, (state, action) => {
        state.loading[action.meta.arg] = true
        state.error = null
      })
       .addCase(checkFollowStatusThunk.fulfilled, (state, action) => {
         const { userId, isFollowing } = action.payload
         state.loading[userId] = false
         state.following[userId] = isFollowing
       })
       .addCase(checkFollowStatusThunk.rejected, (state, action) => {
         const userId = action.meta.arg as string
         state.loading[userId] = false
         state.error = action.payload as string
       })

    builder
      .addCase(followUserThunk.pending, (state, action) => {
        state.loading[action.meta.arg] = true
        state.error = null
      })
       .addCase(followUserThunk.fulfilled, (state, action) => {
         const userId = action.payload
         state.loading[userId] = false
         state.following[userId] = true
       })
       .addCase(followUserThunk.rejected, (state, action) => {
         const userId = action.meta.arg as string
         state.loading[userId] = false
         state.error = action.payload as string
       })

    builder
      .addCase(unfollowUserThunk.pending, (state, action) => {
        state.loading[action.meta.arg] = true
        state.error = null
      })
      .addCase(unfollowUserThunk.fulfilled, (state, action) => {
        const userId = action.payload
        state.loading[userId] = false
        state.following[userId] = false
      })
       .addCase(unfollowUserThunk.rejected, (state, action) => {
         const userId = action.meta.arg as string
         state.loading[userId] = false
         state.error = action.payload as string
       })
  },
})

export default followsSlice.reducer

// Selectors
export const selectIsFollowing = (state: any, userId: string) =>
  state.follows.following[userId] ?? false
export const selectFollowLoading = (state: any, userId: string) =>
  state.follows.loading[userId] ?? false
export const selectFollowsError = (state: any) => state.follows.error