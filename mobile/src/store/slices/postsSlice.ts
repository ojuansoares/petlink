import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { api } from '../../api/axios'
import { offlinePostsRepository } from '../../data/repositories/PostsOfflineRepository'
import { toggleLikeThunk } from './likesSlice'

// ─── Types ───────────────────────────────────────────────────
export interface Post {
  id: string
  author_id: string
  pet_id: string
  image_url: string
  caption: string | null
  location: string | null
  is_pinned: boolean
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
  profiles?: { name: string; avatar_url: string | null; level: number }
  pets?: { name: string }
  liked_by_user?: boolean
}

interface PostsState {
  feed: Post[]
  // ── own user's posts (Profile screen) ──
  myPosts: Post[]
  myPostsPage: number
  hasMoreMyPosts: boolean
  isLoadingMyPosts: boolean
  isLoadingMoreMyPosts: boolean
  // ── public profile posts (PublicProfileScreen) ──
  userPosts: Post[]
  userPostsUserId: string | null
  userPostsPage: number
  hasMoreUserPosts: boolean
  isLoadingUserPosts: boolean
  isLoadingMoreUserPosts: boolean
  // ── followed users feed (Feed screen following tab) ──
  followedFeed: Post[]
  followedFeedPage: number
  hasMoreFollowedFeed: boolean
  isLoadingFollowedFeed: boolean
  isLoadingMoreFollowedFeed: boolean
  // ── misc ──
  feedPage: number
  hasMoreFeed: boolean
  isLoadingFeed: boolean
  isLoadingMoreFeed: boolean
  isPosting: boolean
  error: string | null
}

// ─── Thunks ──────────────────────────────────────────────────

/** Feed global (outros usuários) — salva até 5 no offline */
export const fetchFeedThunk = createAsyncThunk(
  'posts/fetchFeed',
  async (isOnline: boolean, { rejectWithValue }) => {
    if (!isOnline) {
      const localPosts = await offlinePostsRepository.getFeedPhotos()
      return { posts: localPosts, hasMore: false, isOffline: true } as { posts: Post[]; hasMore: boolean; isOffline: boolean }
    }
    try {
      const { data } = await api.get('/posts/feed?page=1&limit=20')
      await offlinePostsRepository.saveFeedPhotos(data.posts)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      const localPosts = await offlinePostsRepository.getFeedPhotos()
      if (localPosts.length > 0) {
        return { posts: localPosts, hasMore: false, isOffline: true } as { posts: Post[]; hasMore: boolean; isOffline: boolean }
      }
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

/**
 * Feed de usuários seguidos
 * Usado na aba "Seguindo" do FeedScreen
 */
export const fetchFollowedFeedThunk = createAsyncThunk(
  'posts/fetchFollowedFeed',
  async (isOnline: boolean, { rejectWithValue }) => {
    if (!isOnline) {
      // TODO: implement offline followed feed if needed
      return { posts: [], hasMore: false, isOffline: true } as { posts: Post[]; hasMore: boolean; isOffline: boolean }
    }
    try {
      const { data } = await api.get('/posts/followed?page=1&limit=20')
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar feed de seguidos')
    }
  }
)

export const fetchMoreFollowedFeedThunk = createAsyncThunk(
  'posts/fetchMoreFollowedFeed',
  async (page: number, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/followed?page=${page}&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais feed de seguidos')
    }
  }
)

/**
 * Posts do próprio usuário logado.
 * Sempre persiste no cache offline (profile_photos).
 * O ProfileScreen deve usar este thunk.
 */
export const fetchMyPostsThunk = createAsyncThunk(
  'posts/fetchMyPosts',
  async (
    payload: { userId: string; isOnline: boolean; cacheOnly?: boolean },
    { rejectWithValue }
  ) => {
    const { userId, isOnline, cacheOnly } = payload

    // cacheOnly=true: apenas retorna cache local sem tocar a API
    if (!isOnline || cacheOnly) {
      const localPosts = await offlinePostsRepository.getProfilePhotos(userId)
      return { posts: localPosts, hasMore: false, isOffline: true, cacheOnly: !!cacheOnly } as {
        posts: Post[]; hasMore: boolean; isOffline: boolean; cacheOnly: boolean
      }
    }

    try {
      const { data } = await api.get(`/posts/user/${userId}?page=1&limit=20`)
      // persiste para uso offline
      await offlinePostsRepository.saveProfilePhotos(userId, data.posts)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      // fallback offline
      const localPosts = await offlinePostsRepository.getProfilePhotos(userId)
      if (localPosts.length > 0) {
        return { posts: localPosts, hasMore: false, isOffline: true, cacheOnly: false } as {
          posts: Post[]; hasMore: boolean; isOffline: boolean; cacheOnly: boolean
        }
      }
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar seus posts')
    }
  }
)

export const fetchMoreMyPostsThunk = createAsyncThunk(
  'posts/fetchMoreMyPosts',
  async (payload: { userId: string; page: number }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/user/${payload.userId}?page=${payload.page}&limit=20`)
      return data as { posts: Post[]; hasMore: boolean }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais posts')
    }
  }
)

/**
 * Posts de um perfil público qualquer (não o próprio usuário).
 * NÃO persiste offline — apenas API GET.
 * O PublicProfileScreen deve usar este thunk.
 */
export const fetchUserPostsThunk = createAsyncThunk(
  'posts/fetchUserPosts',
  async (payload: { userId: string; isOnline: boolean; currentUserId?: string }, { rejectWithValue }) => {
    const { userId, isOnline } = payload

    if (!isOnline) {
      // perfis públicos não ficam no offline
      return { posts: [], hasMore: false, userId } as { posts: Post[]; hasMore: boolean; userId: string }
    }

    try {
      const { data } = await api.get(`/posts/user/${userId}?page=1&limit=20`)
      return { ...data, userId } as { posts: Post[]; hasMore: boolean; userId: string }
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
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
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
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao atualizar publicação')
    }
  }
)

export const togglePinThunk = createAsyncThunk(
  'posts/togglePin',
  async (postId: string, { rejectWithValue, getState }) => {
    try {
      const { data } = await api.patch(`/posts/${postId}/pin`)
      const updatedPost = data.post as Post
      
      const state = getState() as any
      const myPosts = state.posts?.myPosts
      const userId = state.auth?.user?.id

      if (userId && myPosts) {
        const updatedMyPosts = myPosts.map((p: Post) => p.id === postId ? updatedPost : p)
        await offlinePostsRepository.saveProfilePhotos(userId, updatedMyPosts)
      }

      return updatedPost
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
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
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar post')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: PostsState = {
  feed: [],
  myPosts: [],
  myPostsPage: 1,
  hasMoreMyPosts: true,
  isLoadingMyPosts: false,
  isLoadingMoreMyPosts: false,
  userPosts: [],
  userPostsUserId: null,
  userPostsPage: 1,
  hasMoreUserPosts: true,
  isLoadingUserPosts: false,
  isLoadingMoreUserPosts: false,
  feedPage: 1,
  hasMoreFeed: true,
  isLoadingFeed: false,
  isLoadingMoreFeed: false,
  isPosting: false,
  error: null,
  followedFeed: [],
  followedFeedPage: 1,
  hasMoreFollowedFeed: true,
  isLoadingFollowedFeed: false,
  isLoadingMoreFollowedFeed: false,
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
    resetMyPosts: (state) => {
      state.myPosts = []
      state.myPostsPage = 1
      state.hasMoreMyPosts = true
    },
    resetUserPosts: (state) => {
      state.userPosts = []
      state.userPostsPage = 1
      state.hasMoreUserPosts = true
      state.userPostsUserId = null
    },
    resetFollowedFeed: (state) => {
      state.followedFeed = []
      state.followedFeedPage = 1
      state.hasMoreFollowedFeed = true
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

    // ── fetchFollowedFeed ──
    builder
      .addCase(fetchFollowedFeedThunk.pending, (s) => {
        s.isLoadingFollowedFeed = true
        s.error = null
      })
      .addCase(fetchFollowedFeedThunk.fulfilled, (s, a) => {
        s.isLoadingFollowedFeed = false
        s.followedFeed = a.payload.posts
        s.hasMoreFollowedFeed = a.payload.hasMore
        s.followedFeedPage = 2
      })
      .addCase(fetchFollowedFeedThunk.rejected, (s, a) => {
        s.isLoadingFollowedFeed = false
        s.error = a.payload as string
      })

    // ── fetchMoreFollowedFeed ──
    builder
      .addCase(fetchMoreFollowedFeedThunk.pending, (s) => {
        s.isLoadingMoreFollowedFeed = true
      })
      .addCase(fetchMoreFollowedFeedThunk.fulfilled, (s, a) => {
        s.isLoadingMoreFollowedFeed = false
        s.followedFeed.push(...a.payload.posts)
        s.hasMoreFollowedFeed = a.payload.hasMore
        s.followedFeedPage += 1
      })
      .addCase(fetchMoreFollowedFeedThunk.rejected, (s) => {
        s.isLoadingMoreFollowedFeed = false
      })

    // ── fetchMyPosts (own profile) ──
    builder
      .addCase(fetchMyPostsThunk.pending, (s, a) => {
        // cacheOnly é um carregamento silencioso do cache, não mostra loading
        if (!a.meta.arg.cacheOnly) {
          s.isLoadingMyPosts = true
        }
        s.error = null
      })
      .addCase(fetchMyPostsThunk.fulfilled, (s, a) => {
        s.isLoadingMyPosts = false
        const payload = a.payload as { posts: Post[]; hasMore: boolean; cacheOnly?: boolean }
        // Se for cacheOnly (pré-carregamento do cache), só popula se ainda não há dados
        // Evita sobrescrever resultado da API que pode ter chegado antes
        if (payload.cacheOnly && s.myPosts.length > 0) return
        s.myPosts = payload.posts
        s.hasMoreMyPosts = payload.hasMore
        s.myPostsPage = 2
      })
      .addCase(fetchMyPostsThunk.rejected, (s, a) => {
        s.isLoadingMyPosts = false
        s.error = a.payload as string
      })

    // ── fetchMoreMyPosts ──
    builder
      .addCase(fetchMoreMyPostsThunk.pending, (s) => {
        s.isLoadingMoreMyPosts = true
      })
      .addCase(fetchMoreMyPostsThunk.fulfilled, (s, a) => {
        s.isLoadingMoreMyPosts = false
        s.myPosts.push(...a.payload.posts)
        s.hasMoreMyPosts = a.payload.hasMore
        s.myPostsPage += 1
      })
      .addCase(fetchMoreMyPostsThunk.rejected, (s) => {
        s.isLoadingMoreMyPosts = false
      })

    // ── fetchUserPosts (public profile) ──
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
        s.userPostsUserId = a.meta.arg.userId
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
        s.myPosts.unshift(a.payload)
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

        const myIdx = s.myPosts.findIndex((p) => p.id === updatedPost.id)
        if (myIdx >= 0) s.myPosts[myIdx] = updatedPost
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

        const myIdx = s.myPosts.findIndex((p) => p.id === updatedPost.id)
        if (myIdx >= 0) s.myPosts[myIdx] = updatedPost
      })
      .addCase(togglePinThunk.rejected, (s, a) => {
        s.error = a.payload as string
      })

    // ── delete ──
    builder
      .addCase(deletePostThunk.fulfilled, (s, a) => {
        s.feed = s.feed.filter((p) => p.id !== a.payload)
        s.myPosts = s.myPosts.filter((p) => p.id !== a.payload)
      })

    // ── toggleLike (otimista) ──
    builder
      .addCase(toggleLikeThunk.pending, (s, a) => {
        const postId = a.meta.arg
        const updatePost = (p: Post) => {
          if (p.id === postId) {
            p.likes_count += p.liked_by_user ? -1 : 1
            p.liked_by_user = !p.liked_by_user
          }
        }
        s.feed.forEach(updatePost)
        s.myPosts.forEach(updatePost)
        s.followedFeed.forEach(updatePost)
        s.userPosts.forEach(updatePost)
      })
      .addCase(toggleLikeThunk.fulfilled, (s, a) => {
        const { postId, liked, likesCount } = a.payload
        const updatePost = (p: Post) => {
          if (p.id === postId) {
            p.likes_count = likesCount
            p.liked_by_user = liked
          }
        }
        s.feed.forEach(updatePost)
        s.myPosts.forEach(updatePost)
        s.followedFeed.forEach(updatePost)
        s.userPosts.forEach(updatePost)
      })
      .addCase(toggleLikeThunk.rejected, (s, a) => {
        const postId = a.meta.arg
        const revertPost = (p: Post) => {
          if (p.id === postId) {
            p.likes_count += p.liked_by_user ? -1 : 1
            p.liked_by_user = !p.liked_by_user
          }
        }
        s.feed.forEach(revertPost)
        s.myPosts.forEach(revertPost)
        s.followedFeed.forEach(revertPost)
        s.userPosts.forEach(revertPost)
      })
  },
})

export const { clearPostsError, resetFeed, resetMyPosts, resetUserPosts } = postsSlice.actions
export default postsSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectFeed = (s: any): Post[] => s.posts.feed
export const selectHasMoreFeed = (s: any): boolean => s.posts.hasMoreFeed
export const selectFeedPage = (s: any): number => s.posts.feedPage
export const selectIsLoadingFeed = (s: any): boolean => s.posts.isLoadingFeed
export const selectIsLoadingMoreFeed = (s: any): boolean => s.posts.isLoadingMoreFeed

// ── followed feed selectors ───
export const selectFollowedFeed = (s: any): Post[] => s.posts.followedFeed
export const selectHasMoreFollowedFeed = (s: any): boolean => s.posts.hasMoreFollowedFeed
export const selectFollowedFeedPage = (s: any): number => s.posts.followedFeedPage
export const selectIsLoadingFollowedFeed = (s: any): boolean => s.posts.isLoadingFollowedFeed
export const selectIsLoadingMoreFollowedFeed = (s: any): boolean => s.posts.isLoadingMoreFollowedFeed

// ── own user ──
const selectRawMyPosts = (s: any): Post[] => s.posts.myPosts

export const selectMyPosts = createSelector(
  selectRawMyPosts,
  (posts) => [...posts].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
)

export const selectHasMoreMyPosts = (s: any): boolean => s.posts.hasMoreMyPosts
export const selectMyPostsPage = (s: any): number => s.posts.myPostsPage
export const selectIsLoadingMyPosts = (s: any): boolean => s.posts.isLoadingMyPosts
export const selectIsLoadingMoreMyPosts = (s: any): boolean => s.posts.isLoadingMoreMyPosts

// ── public profile ──
const selectRawUserPosts = (s: any): Post[] => s.posts.userPosts

export const selectUserPosts = createSelector(
  selectRawUserPosts,
  (posts) => [...posts].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
)

/**
 * @deprecated use selectUserPosts directly in PublicProfileScreen.
 * Kept for backward compatibility.
 */
export const selectUserPostsByUserId = createSelector(
  [
    (s: any) => s.posts.userPosts,
    (s: any) => s.posts.userPostsUserId,
    (_: any, userId: string) => userId,
  ],
  (posts, storedId, userId) => {
    if (storedId !== userId) return []
    return [...posts].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }
)

export const selectHasMoreUserPosts = (s: any): boolean => s.posts.hasMoreUserPosts
export const selectUserPostsPage = (s: any): number => s.posts.userPostsPage
export const selectIsLoadingUserPosts = (s: any): boolean => s.posts.isLoadingUserPosts
export const selectIsLoadingMoreUserPosts = (s: any): boolean => s.posts.isLoadingMoreUserPosts
export const selectUserPostsUserId = (s: any): string | null => s.posts.userPostsUserId

export const selectIsPosting = (s: any): boolean => s.posts.isPosting