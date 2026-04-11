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

    return {
      ...profile,
      pets_count: count ?? 0
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

