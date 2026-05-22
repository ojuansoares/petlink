import { supabaseAdmin } from '../../config/supabase'

export const profileRepository = {
  async findById(id: string) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) return null

    const { count, error: countError } = await supabaseAdmin
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', id)

    if (countError) throw countError

    const { count: postsCount, error: postsCountError } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)

    if (postsCountError) throw postsCountError

    const { count: followersCount, error: followersCountError } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id)

    if (followersCountError) throw followersCountError

    return {
      ...profile,
      pets_count: count ?? 0,
      posts_count: postsCount ?? 0,
      followers_count: followersCount ?? 0
    }
  },

  async findPublicById(id: string) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, bio, location, created_at')
      .eq('id', id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) return null

    const { count: petsCount, error: petsCountError } = await supabaseAdmin
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', id)

    if (petsCountError) throw petsCountError

    const { count: postsCount, error: postsCountError } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)

    if (postsCountError) throw postsCountError

    const { count: followersCount, error: followersCountError } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id)

    if (followersCountError) throw followersCountError

    return {
      ...profile,
      pets_count: petsCount ?? 0,
      posts_count: postsCount ?? 0,
      followers_count: followersCount ?? 0
    }
  },

  async updateById(
    id: string,
    patch: Partial<{
      name: string
      location: string | null
      avatar_url: string | null
      bio: string | null
      birth_date: string | null
    }>
  ) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async deleteById(id: string) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

