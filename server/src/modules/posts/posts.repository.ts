import { supabaseAdmin } from '../../config/supabase'

export type PostCreateInput = {
  pet_id: string
  image_url: string
  caption?: string | null
  location?: string | null
}

export const postsRepository = {
  async create(authorId: string, input: PostCreateInput) {
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id: authorId,
        pet_id: input.pet_id,
        image_url: input.image_url,
        caption: input.caption ?? null,
        location: input.location ?? null,
      })
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `)
      .single()

    if (error) throw error
    return post
  },

  async findById(postId: string) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `)
      .eq('id', postId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async listFeed(page: number, limit: number, random = false) {
    const offset = (page - 1) * limit
    const query = supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `, { count: 'exact' })

    if (random) {
      query.order('created_at', { ascending: false })
      const { data: shuffled, error } = await query

      if (error) throw error

      const shuffledPosts = shuffled ? shuffled.sort(() => Math.random() - 0.5) : []
      
      const paginatedPosts = shuffledPosts.slice(offset, offset + limit)
      const hasMore = offset + limit < shuffledPosts.length
      
      return { posts: paginatedPosts, hasMore }
    }

    query.order('created_at', { ascending: false })
    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw error
    const hasMore = count !== null ? offset + limit < count : (data?.length === limit)
    return { posts: data || [], hasMore }
  },

  async listByAuthor(authorId: string, page: number, limit: number) {
    const offset = (page - 1) * limit
    const { data, error, count } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `, { count: 'exact' })
      .eq('author_id', authorId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    const hasMore = count !== null ? offset + limit < count : (data?.length === limit)
    return { posts: data || [], hasMore }
  },

  async findByIdAndAuthor(authorId: string, postId: string) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('author_id', authorId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async updateByIdAndAuthor(authorId: string, postId: string, patch: Partial<{ image_url: string; caption: string | null; location: string | null; is_pinned: boolean }>) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .update(patch)
      .eq('id', postId)
      .eq('author_id', authorId)
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `)
      .single()

    if (error) throw error
    return data
  },

  async deleteByIdAndAuthor(authorId: string, postId: string) {
    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', authorId)

    if (error) throw error
  },

  async countPinnedByAuthor(authorId: string) {
    const { count, error } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId)
      .eq('is_pinned', true)

    if (error) throw error
    return count ?? 0
  },

  async listFollowed(followerId: string, page: number, limit: number) {
    const offset = (page - 1) * limit

    const { data: followData, error: followError } = await supabaseAdmin
      .from('follows')
      .select('following_id')
      .eq('follower_id', followerId)

    if (followError) throw followError

    const followedIds = followData?.map(f => f.following_id) || []

    if (followedIds.length === 0) {
      return { posts: [], hasMore: false }
    }

    const { data, error, count } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        profiles:author_id (name, avatar_url),
        pets:pet_id (name)
      `, { count: 'exact' })
      .in('author_id', followedIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    const hasMore = count !== null ? offset + limit < count : (data?.length === limit)
    return { posts: data || [], hasMore }
  }
}
