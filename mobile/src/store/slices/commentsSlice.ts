import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit'
import { api } from '../../api/axios'
import { toggleCommentLikeThunk } from './commentLikesSlice'

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  isPinned: boolean
  likesCount: number
  createdAt: string
  updatedAt: string
  username?: string | null
  avatar_url?: string | null
}

interface CommentsState {
  byPostId: Record<string, Comment[]>
  pages: Record<string, number>
  hasMore: Record<string, boolean>
  isLoading: boolean
  isLoadingMore: boolean
  isPosting: boolean
  error: string | null
}

const initialState: CommentsState = {
  byPostId: {},
  pages: {},
  hasMore: {},
  isLoading: false,
  isLoadingMore: false,
  isPosting: false,
  error: null,
}

export const fetchCommentsThunk = createAsyncThunk(
  'comments/fetch',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data, status } = await api.get(`/posts/${postId}/comments?page=1&limit=10`)
      if (__DEV__) {
        console.log(`[comments] GET /posts/${postId}/comments → ${status}`, (data as any)?.data?.length ?? 0)
      }
      const result = data as { data: Comment[]; total: number; page: number; hasMore: boolean }
      return { postId, comments: result.data, hasMore: result.hasMore }
    } catch (err: any) {
      if (__DEV__) {
        console.log(`[comments] GET /posts/${postId}/comments failed:`, err.message, err.response?.status)
      }
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar comentários')
    }
  }
)

export const fetchMoreCommentsThunk = createAsyncThunk(
  'comments/fetchMore',
  async (payload: { postId: string; page: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/${payload.postId}/comments?page=${payload.page}&limit=10`)
      const result = data as { data: Comment[]; total: number; page: number; hasMore: boolean }
      return { postId: payload.postId, comments: result.data, page: payload.page, hasMore: result.hasMore }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais comentários')
    }
  }
)

export const createCommentThunk = createAsyncThunk(
  'comments/create',
  async (
    payload: { postId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(`/posts/${payload.postId}/comments`, {
        content: payload.content,
      })
      return data as Comment
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao comentar')
    }
  }
)

export const togglePinCommentThunk = createAsyncThunk(
  'comments/togglePin',
  async (
    payload: { postId: string; commentId: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.patch(`/posts/${payload.postId}/comments/${payload.commentId}/pin`)
      return data as Comment
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao fixar comentário')
    }
  }
)

export const editCommentThunk = createAsyncThunk(
  'comments/edit',
  async (
    payload: { postId: string; commentId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.patch(`/posts/${payload.postId}/comments/${payload.commentId}`, {
        content: payload.content,
      })
      return data as Comment
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao editar comentário')
    }
  }
)

export const deleteCommentThunk = createAsyncThunk(
  'comments/delete',
  async (
    payload: { postId: string; commentId: string },
    { rejectWithValue }
  ) => {
    try {
      await api.delete(`/posts/${payload.postId}/comments/${payload.commentId}`)
      return payload
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar comentário')
    }
  }
)

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    clearPostComments: (state, action) => {
      delete state.byPostId[action.payload]
      delete state.pages[action.payload]
      delete state.hasMore[action.payload]
    },
    clearAllComments: (state) => {
      state.byPostId = {}
      state.pages = {}
      state.hasMore = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommentsThunk.pending, (s) => {
        s.isLoading = true
        s.error = null
      })
      .addCase(fetchCommentsThunk.fulfilled, (s, a) => {
        s.isLoading = false
        s.byPostId[a.payload.postId] = a.payload.comments
        s.pages[a.payload.postId] = 1
        s.hasMore[a.payload.postId] = a.payload.hasMore
        if (__DEV__) {
          console.log('[commentsReducer] fetched', a.payload.comments.length, 'hasMore:', a.payload.hasMore)
        }
      })
      .addCase(fetchCommentsThunk.rejected, (s, a) => {
        s.isLoading = false
        s.error = a.payload as string
      })
      .addCase(fetchMoreCommentsThunk.pending, (s) => {
        s.isLoadingMore = true
      })
      .addCase(fetchMoreCommentsThunk.fulfilled, (s, a) => {
        s.isLoadingMore = false
        const { postId, comments, page, hasMore } = a.payload
        if (s.byPostId[postId]) {
          s.byPostId[postId] = [...s.byPostId[postId], ...comments]
        } else {
          s.byPostId[postId] = comments
        }
        s.pages[postId] = page
        s.hasMore[postId] = hasMore
      })
      .addCase(fetchMoreCommentsThunk.rejected, (s) => {
        s.isLoadingMore = false
      })
      .addCase(createCommentThunk.pending, (s) => {
        s.isPosting = true
      })
      .addCase(createCommentThunk.fulfilled, (s, a) => {
        s.isPosting = false
        const postId = a.meta.arg.postId
        if (s.byPostId[postId]) {
          s.byPostId[postId] = [a.payload, ...s.byPostId[postId]]
        } else {
          s.byPostId[postId] = [a.payload]
        }
      })
      .addCase(createCommentThunk.rejected, (s) => {
        s.isPosting = false
      })
      .addCase(editCommentThunk.fulfilled, (s, a) => {
        const updated = a.payload
        const list = s.byPostId[updated.postId]
        if (list) {
          s.byPostId[updated.postId] = list.map((c) =>
            c.id === updated.id ? { ...c, content: updated.content } : c
          )
        }
      })
      .addCase(deleteCommentThunk.fulfilled, (s, a) => {
        const { postId, commentId } = a.payload
        if (s.byPostId[postId]) {
          s.byPostId[postId] = s.byPostId[postId].filter((c) => c.id !== commentId)
        }
      })
      .addCase(togglePinCommentThunk.fulfilled, (s, a) => {
        const updated = a.payload
        const list = s.byPostId[updated.postId]
        if (list) {
          s.byPostId[updated.postId] = list.map((c) =>
            c.id === updated.id ? { ...c, isPinned: updated.isPinned } : c
          )
        }
      })
      .addCase(toggleCommentLikeThunk.fulfilled, (s, a) => {
        const { commentId, likesCount } = a.payload
        for (const list of Object.values(s.byPostId)) {
          const idx = list.findIndex((c) => c.id === commentId)
          if (idx >= 0) {
            list[idx] = { ...list[idx], likesCount }
            break
          }
        }
      })
  },
})

export const { clearPostComments, clearAllComments } = commentsSlice.actions
export default commentsSlice.reducer

export const selectCommentsByPostId = createSelector(
  [(s: any) => s.comments.byPostId, (s: any, postId: string) => postId],
  (byPostId, postId) => byPostId[postId] ?? []
)
export const selectCommentsLoading = (s: any): boolean => s.comments.isLoading
export const selectCommentsLoadingMore = (s: any): boolean => s.comments.isLoadingMore
export const selectCommentsPosting = (s: any): boolean => s.comments.isPosting
export const selectCommentsError = (s: any): string | null => s.comments.error
export const selectCommentsHasMore = (s: any, postId: string): boolean => s.comments.hasMore[postId] ?? false
export const selectCommentsPage = (s: any, postId: string): number => s.comments.pages[postId] ?? 1
