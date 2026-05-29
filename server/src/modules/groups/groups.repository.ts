import { supabaseAdmin } from '../../config/supabase'

export type Group = {
  id: string
  name: string
  description: string | null
  photo_url: string | null
  species: string | null
  is_public: boolean
  created_by: string
  member_count: number
  created_at: string
  updated_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface GroupWithRole extends Group {
  role: 'owner' | 'admin' | 'member'
}

export type CreateGroupInput = {
  name: string
  description?: string
  photo_url?: string
  species?: string
  is_public?: boolean
}

export const groupsRepository = {
  async create(group: CreateGroupInput, userId: string): Promise<Group> {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .insert({ ...group, created_by: userId })
      .select()
      .single()

    if (error) throw error
    return data as Group
  },

  async addMember(groupId: string, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await supabaseAdmin
      .from('group_members')
      .insert({ group_id: groupId, user_id: userId, role })

    if (error) throw error

    await supabaseAdmin.rpc('increment_group_member_count', { group_id: groupId })
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error

    await supabaseAdmin.rpc('decrement_group_member_count', { group_id: groupId })
  },

  async updateMemberRole(groupId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async findById(id: string): Promise<Group | null> {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Group
  },

  async findMembership(groupId: string, userId: string): Promise<GroupMember | null> {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (error) return null
    return data as GroupMember
  },

  async listByUser(userId: string): Promise<GroupWithRole[]> {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('role, groups(*)')
      .eq('user_id', userId)

    if (error) throw error

    return ((data ?? []) as any[]).map((m: any) => ({
      ...m.groups,
      role: m.role,
    })) as GroupWithRole[]
  },

  async discover(page: number = 1, limit: number = 20): Promise<{ groups: Group[]; hasMore: boolean }> {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      groups: (data ?? []) as Group[],
      hasMore: (count ?? 0) > from + limit,
    }
  },

  async search(q: string, page: number = 1, limit: number = 10): Promise<{ groups: Group[]; hasMore: boolean }> {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .ilike('name', `%${q}%`)
      .order('member_count', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      groups: (data ?? []) as Group[],
      hasMore: (count ?? 0) > from + limit,
    }
  },

  async getMembers(groupId: string): Promise<(GroupMember & { name: string; avatar_url: string | null })[]> {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*, auth.users!inner(id, raw_user_meta_data)')
      .eq('group_id', groupId)

    if (error) throw error

    return ((data ?? []) as any[]).map((m: any) => ({
      id: m.id,
      group_id: m.group_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      name: m.raw_user_meta_data?.name ?? m.raw_user_meta_data?.full_name ?? 'Usuário',
      avatar_url: m.raw_user_meta_data?.avatar_url ?? null,
    }))
  },
}
