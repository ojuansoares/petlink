import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export interface Post {
  id:         string
  authorId:   string
  authorName: string
  authorAvatar: string | null
  petId:      string | null
  petName:    string | null
  content:    string
  imageUrl:   string | null
  locationId: string | null    // checkin em local pet-friendly
  locationName: string | null
  likesCount: number
  commentsCount: number
  likedByMe:  boolean
  createdAt:  string
}

export interface Comment {
  id:         string
  postId:     string
  authorId:   string
  authorName: string
  authorAvatar: string | null
  content:    string
  createdAt:  string
}

interface PostsState {
  feed:           Post[]
  comments:       Record<string, Comment[]>  // postId → comments
  feedPage:       number
  hasMoreFeed:    boolean
  isLoadingFeed:  boolean
  isLoadingMore:  boolean
  isPosting:      boolean
  error:          string | null
}

// ─── Thunks ──────────────────────────────────────────────────
export const fetchFeedThunk = createAsyncThunk(
  'posts/fetchFeed',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/posts/feed?page=1&limit=20')
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar feed')
    }
  }
)

export const fetchMoreFeedThunk = createAsyncThunk(
  'posts/fetchMore',
  async (page: number, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${page}&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais')
    }
  }
)

export const createPostThunk = createAsyncThunk(
  'posts/create',
  async (
    payload: { content: string; petId?: string; imageUrl?: string; locationId?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post('/posts', payload)
      return data as Post
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao publicar')
    }
  }
)

export const deletePostThunk = createAsyncThunk(
  'posts/delete',
  async (postId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}`)
      return postId
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar post')
    }
  }
)

export const toggleLikeThunk = createAsyncThunk(
  'posts/toggleLike',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${postId}/like`)
      return { postId, liked: data.liked as boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao curtir')
    }
  }
)

export const fetchCommentsThunk = createAsyncThunk(
  'posts/fetchComments',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/${postId}/comments`)
      return { postId, comments: data as Comment[] }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar comentários')
    }
  }
)

export const addCommentThunk = createAsyncThunk(
  'posts/addComment',
  async (payload: { postId: string; content: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${payload.postId}/comments`, {
        content: payload.content,
      })
      return { postId: payload.postId, comment: data as Comment }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao comentar')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: PostsState = {
  feed:          [],
  comments:      {},
  feedPage:      1,
  hasMoreFeed:   true,
  isLoadingFeed: false,
  isLoadingMore: false,
  isPosting:     false,
  error:         null,
}

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearPostsError: (state) => { state.error = null },
    resetFeed:       (state) => {
      state.feed        = []
      state.feedPage    = 1
      state.hasMoreFeed = true
    },
  },
  extraReducers: (builder) => {
    // ── fetchFeed ──
    builder
      .addCase(fetchFeedThunk.pending,   (s) => { s.isLoadingFeed = true; s.error = null })
      .addCase(fetchFeedThunk.fulfilled, (s, a) => {
        s.isLoadingFeed = false
        s.feed          = a.payload.posts
        s.hasMoreFeed   = a.payload.hasMore
        s.feedPage      = 2
      })
      .addCase(fetchFeedThunk.rejected, (s, a) => { s.isLoadingFeed = false; s.error = a.payload as string })

    // ── fetchMore (paginação) ──
    builder
      .addCase(fetchMoreFeedThunk.pending,   (s) => { s.isLoadingMore = true })
      .addCase(fetchMoreFeedThunk.fulfilled, (s, a) => {
        s.isLoadingMore = false
        s.feed.push(...a.payload.posts)
        s.hasMoreFeed   = a.payload.hasMore
        s.feedPage     += 1
      })
      .addCase(fetchMoreFeedThunk.rejected, (s) => { s.isLoadingMore = false })

    // ── create ──
    builder
      .addCase(createPostThunk.pending,   (s) => { s.isPosting = true })
      .addCase(createPostThunk.fulfilled, (s, a) => {
        s.isPosting = false
        s.feed.unshift(a.payload)  // aparece no topo do feed
      })
      .addCase(createPostThunk.rejected, (s, a) => { s.isPosting = false; s.error = a.payload as string })

    // ── delete ──
    builder
      .addCase(deletePostThunk.fulfilled, (s, a) => {
        s.feed = s.feed.filter(p => p.id !== a.payload)
      })

    // ── like (otimista — atualiza antes da resposta) ──
    builder
      .addCase(toggleLikeThunk.pending, (s, a) => {
        const post = s.feed.find(p => p.id === a.meta.arg)
        if (post) {
          post.likedByMe  = !post.likedByMe
          post.likesCount += post.likedByMe ? 1 : -1
        }
      })
      .addCase(toggleLikeThunk.rejected, (s, a) => {
        // Reverte se deu erro
        const post = s.feed.find(p => p.id === a.meta.arg)
        if (post) {
          post.likedByMe  = !post.likedByMe
          post.likesCount += post.likedByMe ? 1 : -1
        }
      })

    // ── comments ──
    builder
      .addCase(fetchCommentsThunk.fulfilled, (s, a) => {
        s.comments[a.payload.postId] = a.payload.comments
      })
      .addCase(addCommentThunk.fulfilled, (s, a) => {
        const { postId, comment } = a.payload
        if (!s.comments[postId]) s.comments[postId] = []
        s.comments[postId].push(comment)

        // Atualiza contador no post
        const post = s.feed.find(p => p.id === postId)
        if (post) post.commentsCount += 1
      })
  },
})

export const { clearPostsError, resetFeed } = postsSlice.actions
export default postsSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectFeed          = (s: any): Post[]    => s.posts.feed
export const selectHasMoreFeed   = (s: any): boolean   => s.posts.hasMoreFeed
export const selectFeedPage      = (s: any): number    => s.posts.feedPage
export const selectIsLoadingFeed = (s: any): boolean   => s.posts.isLoadingFeed
export const selectIsLoadingMore = (s: any): boolean   => s.posts.isLoadingMore
export const selectIsPosting     = (s: any): boolean   => s.posts.isPosting
export const selectComments      = (postId: string) => (s: any): Comment[] =>
  s.posts.comments[postId] ?? []