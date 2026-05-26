import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

interface CommentLikesState {
  likedByCommentId: Record<string, boolean>
  loadingByCommentId: Record<string, boolean>
}

const initialState: CommentLikesState = {
  likedByCommentId: {},
  loadingByCommentId: {},
}

export const toggleCommentLikeThunk = createAsyncThunk(
  'commentLikes/toggle',
  async (commentId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/comments/${commentId}/like`)
      return { commentId, ...data } as { commentId: string; liked: boolean; likesCount: number }
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao curtir comentário')
    }
  }
)

const commentLikesSlice = createSlice({
  name: 'commentLikes',
  initialState,
  reducers: {
    clearCommentLikes: (state) => {
      state.likedByCommentId = {}
      state.loadingByCommentId = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(toggleCommentLikeThunk.pending, (s, a) => {
        s.loadingByCommentId[a.meta.arg] = true
      })
      .addCase(toggleCommentLikeThunk.fulfilled, (s, a) => {
        s.loadingByCommentId[a.payload.commentId] = false
        s.likedByCommentId[a.payload.commentId] = a.payload.liked
      })
      .addCase(toggleCommentLikeThunk.rejected, (s, a) => {
        s.loadingByCommentId[a.meta.arg] = false
      })
  },
})

export const { clearCommentLikes } = commentLikesSlice.actions
export default commentLikesSlice.reducer

export const selectCommentLiked = (commentId: string) => (s: any) =>
  s.commentLikes.likedByCommentId[commentId]
export const selectCommentLikeLoading = (commentId: string) => (s: any) =>
  s.commentLikes.loadingByCommentId[commentId] ?? false
