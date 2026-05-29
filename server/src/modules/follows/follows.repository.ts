import { supabaseAdmin } from '../../config/supabase'

export const followsRepository = {
  async create(followerId: string, followingId: string) {
    // Prevent self-follow at service level, but also guard here
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself')
    }
    const { data, error } = await supabaseAdmin
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select('*')
      .single()
    if (error) {
      // Duplicate follow (PK violation) – ignore
      if ((error as any).code === '23505') return null
      throw error
    }
    return data
  },

  async delete(followerId: string, followingId: string) {
    const { error } = await supabaseAdmin
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
    if (error) throw error
  },

  async exists(followerId: string, followingId: string) {
    const { count, error } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
    if (error) throw error
    return (count ?? 0) > 0
  },

  async listFollowers(userId: string, limit = 20, offset = 0) {
    const { data, error, count } = await supabaseAdmin
      .from('follows')
        .select(
          `
            profiles:follower_id (id, name, avatar_url, bio, created_at, level),
            created_at
          `,
        { count: 'exact' }
      )
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const hasMore = count !== null ? offset + limit < count : (data?.length ?? 0) === limit
    return { followers: data ?? [], hasMore }
  },

  async listFollowing(userId: string, limit = 20, offset = 0) {
    const { data, error, count } = await supabaseAdmin
      .from('follows')
        .select(
          `
            profiles:following_id (id, name, avatar_url, bio, created_at, level),
            created_at
          `,
        { count: 'exact' }
      )
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    const hasMore = count !== null ? offset + limit < count : (data?.length ?? 0) === limit
    return { following: data ?? [], hasMore }
  },
}
