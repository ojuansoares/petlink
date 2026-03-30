import { supabaseAdmin } from '../../config/supabase'

export const authRepository = {
  async findProfileMaybe(id: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async findUserById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createProfile(id: string, name: string, location?: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({ id, name, location })
      .select()
      .single()

    if (error) throw error
    return data
  },
}