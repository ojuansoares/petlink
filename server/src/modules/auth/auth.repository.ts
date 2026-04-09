import { supabaseAdmin } from '../../config/supabase'

export const authRepository = {
  async emailExists(email: string) {
    let page = 1
    const perPage = 200
    const target = email.trim().toLowerCase()

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error

      const users = data.users ?? []
      if (users.some((user) => user.email?.toLowerCase() === target)) {
        return true
      }

      if (users.length < perPage) {
        return false
      }

      page += 1
    }
  },

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

  async upsertProfile(id: string, name: string, location?: string, birthDate?: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id, name, location, ...(birthDate ? { birth_date: birthDate } : {}) }, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error
    return data
  },
}