import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export interface Post {
  id: string
  author_id: string
  pet_id: string
  image_url: string
  caption: string | null
  location: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
  profiles?: { name: string; avatar_url: string | null }
  pets?: { name: string }
}

interface PostsState {
  feed: Post[]
  userPosts: Post[]
  feedPage: number
  userPostsPage: number
  hasMoreFeed: boolean
  hasMoreUserPosts: boolean
  isLoadingFeed: boolean
  isLoadingMoreFeed: boolean
  isLoadingUserPosts: boolean
  isLoadingMoreUserPosts: boolean
  isPosting: boolean
  error: string | null
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
  'posts/fetchMoreFeed',
  async (page: number, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/feed?page=${page}&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais')
    }
  }
)

export const fetchUserPostsThunk = createAsyncThunk(
  'posts/fetchUserPosts',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/user/${userId}?page=1&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar posts do usuário')
    }
  }
)

export const fetchMoreUserPostsThunk = createAsyncThunk(
  'posts/fetchMoreUserPosts',
  async (payload: { userId: string; page: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/user/${payload.userId}?page=${payload.page}&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais posts do usuário')
    }
  }
)

export const createPostThunk = createAsyncThunk(
  'posts/create',
  async (
    payload: { image_url: string; pet_id: string; caption?: string; location?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post('/posts', payload)
      return data.post as Post
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao publicar')
    }
  }
)

export const updatePostThunk = createAsyncThunk(
  'posts/update',
  async (
    payload: { postId: string; patch: { caption?: string; location?: string } },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.put(`/posts/${payload.postId}`, payload.patch)
      return data.post as Post
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao atualizar publicação')
    }
  }
)

export const togglePinThunk = createAsyncThunk(
  'posts/togglePin',
  async (postId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/posts/${postId}/pin`)
      return data.post as Post
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao fixar/desfixar post')
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

// ─── Slice ───────────────────────────────────────────────────
const initialState: PostsState = {
  feed: [],
  userPosts: [],
  feedPage: 1,
  userPostsPage: 1,
  hasMoreFeed: true,
  hasMoreUserPosts: true,
  isLoadingFeed: false,
  isLoadingMoreFeed: false,
  isLoadingUserPosts: false,
  isLoadingMoreUserPosts: false,
  isPosting: false,
  error: null,
}

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearPostsError: (state) => {
      state.error = null
    },
    resetFeed: (state) => {
      state.feed = []
      state.feedPage = 1
      state.hasMoreFeed = true
    },
    resetUserPosts: (state) => {
      state.userPosts = []
      state.userPostsPage = 1
      state.hasMoreUserPosts = true
    },
  },
  extraReducers: (builder) => {
    // ── fetchFeed ──
    builder
      .addCase(fetchFeedThunk.pending, (s) => {
        s.isLoadingFeed = true
        s.error = null
      })
      .addCase(fetchFeedThunk.fulfilled, (s, a) => {
        s.isLoadingFeed = false
        s.feed = a.payload.posts
        s.hasMoreFeed = a.payload.hasMore
        s.feedPage = 2
      })
      .addCase(fetchFeedThunk.rejected, (s, a) => {
        s.isLoadingFeed = false
        s.error = a.payload as string
      })

    // ── fetchMoreFeed ──
    builder
      .addCase(fetchMoreFeedThunk.pending, (s) => {
        s.isLoadingMoreFeed = true
      })
      .addCase(fetchMoreFeedThunk.fulfilled, (s, a) => {
        s.isLoadingMoreFeed = false
        s.feed.push(...a.payload.posts)
        s.hasMoreFeed = a.payload.hasMore
        s.feedPage += 1
      })
      .addCase(fetchMoreFeedThunk.rejected, (s) => {
        s.isLoadingMoreFeed = false
      })

    // ── fetchUserPosts ──
    builder
      .addCase(fetchUserPostsThunk.pending, (s) => {
        s.isLoadingUserPosts = true
        s.error = null
      })
      .addCase(fetchUserPostsThunk.fulfilled, (s, a) => {
        s.isLoadingUserPosts = false
        s.userPosts = a.payload.posts
        s.hasMoreUserPosts = a.payload.hasMore
        s.userPostsPage = 2
      })
      .addCase(fetchUserPostsThunk.rejected, (s, a) => {
        s.isLoadingUserPosts = false
        s.error = a.payload as string
      })

    // ── fetchMoreUserPosts ──
    builder
      .addCase(fetchMoreUserPostsThunk.pending, (s) => {
        s.isLoadingMoreUserPosts = true
      })
      .addCase(fetchMoreUserPostsThunk.fulfilled, (s, a) => {
        s.isLoadingMoreUserPosts = false
        s.userPosts.push(...a.payload.posts)
        s.hasMoreUserPosts = a.payload.hasMore
        s.userPostsPage += 1
      })
      .addCase(fetchMoreUserPostsThunk.rejected, (s) => {
        s.isLoadingMoreUserPosts = false
      })

    // ── create ──
    builder
      .addCase(createPostThunk.pending, (s) => {
        s.isPosting = true
      })
      .addCase(createPostThunk.fulfilled, (s, a) => {
        s.isPosting = false
        s.feed.unshift(a.payload)
        s.userPosts.unshift(a.payload)
      })
      .addCase(createPostThunk.rejected, (s, a) => {
        s.isPosting = false
        s.error = a.payload as string
      })

    // ── update ──
    builder
      .addCase(updatePostThunk.fulfilled, (s, a) => {
        const updatedPost = a.payload
        const feedIdx = s.feed.findIndex((p) => p.id === updatedPost.id)
        if (feedIdx >= 0) s.feed[feedIdx] = updatedPost

        const userIdx = s.userPosts.findIndex((p) => p.id === updatedPost.id)
        if (userIdx >= 0) s.userPosts[userIdx] = updatedPost
      })
      .addCase(updatePostThunk.rejected, (s, a) => {
        s.error = a.payload as string
      })

    // ── togglePin ──
    builder
      .addCase(togglePinThunk.fulfilled, (s, a) => {
        const updatedPost = a.payload
        const feedIdx = s.feed.findIndex((p) => p.id === updatedPost.id)
        if (feedIdx >= 0) s.feed[feedIdx] = updatedPost

        const userIdx = s.userPosts.findIndex((p) => p.id === updatedPost.id)
        if (userIdx >= 0) {
          s.userPosts[userIdx] = updatedPost
          // Optionally, userPosts could be re-sorted by is_pinned and created_at here.
          // But simply updating it is enough; the list will sort on next fetch.
        }
      })
      .addCase(togglePinThunk.rejected, (s, a) => {
        s.error = a.payload as string
      })

    // ── delete ──
    builder
      .addCase(deletePostThunk.fulfilled, (s, a) => {
        s.feed = s.feed.filter((p) => p.id !== a.payload)
        s.userPosts = s.userPosts.filter((p) => p.id !== a.payload)
      })
  },
})

export const { clearPostsError, resetFeed, resetUserPosts } = postsSlice.actions
export default postsSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectFeed = (s: any): Post[] => s.posts.feed
export const selectHasMoreFeed = (s: any): boolean => s.posts.hasMoreFeed
export const selectFeedPage = (s: any): number => s.posts.feedPage
export const selectIsLoadingFeed = (s: any): boolean => s.posts.isLoadingFeed
export const selectIsLoadingMoreFeed = (s: any): boolean => s.posts.isLoadingMoreFeed

const selectRawUserPosts = (s: any): Post[] => s.posts.userPosts

export const selectUserPosts = createSelector(
  selectRawUserPosts,
  (posts) => [...posts].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
)
export const selectHasMoreUserPosts = (s: any): boolean => s.posts.hasMoreUserPosts
export const selectUserPostsPage = (s: any): number => s.posts.userPostsPage
export const selectIsLoadingUserPosts = (s: any): boolean => s.posts.isLoadingUserPosts
export const selectIsLoadingMoreUserPosts = (s: any): boolean => s.posts.isLoadingMoreUserPosts

export const selectIsPosting = (s: any): boolean => s.posts.isPosting