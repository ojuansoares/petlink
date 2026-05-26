import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

export interface LikeEntry {
  id: string
  postId: string
  userId: string
  createdAt: string
  username?: string | null
  avatar_url?: string | null
}

interface LikesState {
  likedByPostId: Record<string, boolean>
  loadingByPostId: Record<string, boolean>
  likesByPostId: Record<string, LikeEntry[]>
  pages: Record<string, number>
  hasMore: Record<string, boolean>
  isLoadingMore: boolean
  loadingListByPostId: Record<string, boolean>
}

const initialState: LikesState = {
  likedByPostId: {},
  loadingByPostId: {},
  likesByPostId: {},
  pages: {},
  hasMore: {},
  isLoadingMore: false,
  loadingListByPostId: {},
}

export const toggleLikeThunk = createAsyncThunk(
  'likes/toggle',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${postId}/like`)
      return { postId, ...data } as { postId: string; liked: boolean; likesCount: number }
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao curtir')
    }
  }
)

export const fetchLikesByPostThunk = createAsyncThunk(
  'likes/fetchByPost',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data, status } = await api.get(`/posts/${postId}/likes?page=1&limit=10`)
      if (__DEV__) {
        console.log(`[likes] GET /posts/${postId}/likes → ${status}`, (data as any)?.data?.length ?? 0)
      }
      const result = data as { data: LikeEntry[]; total: number; page: number; hasMore: boolean }
      return { postId, likes: result.data, hasMore: result.hasMore }
    } catch (err: any) {
      if (__DEV__) {
        console.log(`[likes] GET /posts/${postId}/likes failed:`, err.message, err.response?.status)
      }
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar curtidas')
    }
  }
)

export const fetchMoreLikesByPostThunk = createAsyncThunk(
  'likes/fetchMoreByPost',
  async (payload: { postId: string; page: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/${payload.postId}/likes?page=${payload.page}&limit=10`)
      const result = data as { data: LikeEntry[]; total: number; page: number; hasMore: boolean }
      return { postId: payload.postId, likes: result.data, page: payload.page, hasMore: result.hasMore }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar mais curtidas')
    }
  }
)

export const fetchLikeStatusThunk = createAsyncThunk(
  'likes/status',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/${postId}/like`)
      return { postId, ...data } as { postId: string; liked: boolean; likesCount: number }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar status')
    }
  }
)

const likesSlice = createSlice({
  name: 'likes',
  initialState,
  reducers: {
    clearLikes: (state) => {
      state.likedByPostId = {}
      state.loadingByPostId = {}
      state.likesByPostId = {}
      state.pages = {}
      state.hasMore = {}
      state.loadingListByPostId = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(toggleLikeThunk.pending, (s, a) => {
        s.loadingByPostId[a.meta.arg] = true
      })
      .addCase(toggleLikeThunk.fulfilled, (s, a) => {
        s.loadingByPostId[a.payload.postId] = false
        s.likedByPostId[a.payload.postId] = a.payload.liked
      })
      .addCase(toggleLikeThunk.rejected, (s, a) => {
        s.loadingByPostId[a.meta.arg] = false
      })
      .addCase(fetchLikeStatusThunk.fulfilled, (s, a) => {
        s.likedByPostId[a.payload.postId] = a.payload.liked
      })
      .addCase(fetchLikesByPostThunk.pending, (s, a) => {
        s.loadingListByPostId[a.meta.arg] = true
      })
      .addCase(fetchLikesByPostThunk.fulfilled, (s, a) => {
        s.loadingListByPostId[a.payload.postId] = false
        if (__DEV__) {
          console.log('[likesReducer] byPostId key=', a.payload.postId, 'len=', a.payload.likes.length)
        }
        s.likesByPostId[a.payload.postId] = a.payload.likes
        s.pages[a.payload.postId] = 1
        s.hasMore[a.payload.postId] = a.payload.hasMore
      })
      .addCase(fetchLikesByPostThunk.rejected, (s, a) => {
        s.loadingListByPostId[a.meta.arg] = false
      })
      .addCase(fetchMoreLikesByPostThunk.pending, (s) => {
        s.isLoadingMore = true
      })
      .addCase(fetchMoreLikesByPostThunk.fulfilled, (s, a) => {
        s.isLoadingMore = false
        const { postId, likes, page, hasMore } = a.payload
        if (s.likesByPostId[postId]) {
          s.likesByPostId[postId] = [...s.likesByPostId[postId], ...likes]
        } else {
          s.likesByPostId[postId] = likes
        }
        s.pages[postId] = page
        s.hasMore[postId] = hasMore
      })
      .addCase(fetchMoreLikesByPostThunk.rejected, (s) => {
        s.isLoadingMore = false
      })
  },
})

export const { clearLikes } = likesSlice.actions
export default likesSlice.reducer

export const selectLikedByPostId = (s: any) => s.likes.likedByPostId
export const selectIsLikeLoading = (postId: string) => (s: any) =>
  s.likes.loadingByPostId[postId] ?? false
export const selectLikesByPostId = createSelector(
  [(s: any) => s.likes.likesByPostId, (s: any, postId: string) => postId],
  (likesByPostId, postId) => likesByPostId[postId] ?? []
)
export const selectLikesHasMore = (s: any, postId: string): boolean => s.likes.hasMore[postId] ?? false
export const selectLikesPage = (s: any, postId: string): number => s.likes.pages[postId] ?? 1
export const selectLikesLoadingMore = (s: any): boolean => s.likes.isLoadingMore
export const selectIsLikesListLoading = (postId: string) => (s: any): boolean =>
  s.likes.loadingListByPostId[postId] ?? false
