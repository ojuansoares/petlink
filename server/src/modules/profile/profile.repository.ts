import { supabaseAdmin } from '../../config/supabase'

export const profileRepository = {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async updateById(
    id: string,
    patch: Partial<{
      name: string
      location: string | null
      avatar_url: string | null
      bio: string | null
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
}

