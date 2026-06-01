import { supabaseAdmin } from '../../config/supabase'
import { Post } from '../../models/Post'
import { Comment } from '../../models/Comment'
import { Like } from '../../models/Like'
import { CommentLike } from '../../models/CommentLike'

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

export type GroupInvite = {
  id: string
  group_id: string
  invited_user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

export type CreateGroupInput = {
  name: string
  description?: string
  photo_url?: string
  species?: string
  is_public?: boolean
  location?: string
}

export type UpdateGroupInput = {
  name?: string
  description?: string
  photo_url?: string
  species?: string
  is_public?: boolean
  location?: string
}

export const groupsRepository = {
  async create(group: CreateGroupInput, userId: string): Promise<Group> {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .insert({ ...group, created_by: userId, member_count: 0 })
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

  async getUserGroupIds(userId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
    return (data ?? []).map((m: any) => m.group_id)
  },

  async getUserGroupIdsWithInvites(userId: string): Promise<string[]> {
    const memberIds = await this.getUserGroupIds(userId)

    const { data: invites } = await supabaseAdmin
      .from('group_invites')
      .select('group_id')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')

    const inviteGroupIds = (invites ?? []).map((i: any) => i.group_id)

    return [...new Set([...memberIds, ...inviteGroupIds])]
  },

  async discover(userId: string, page: number = 1, limit: number = 20): Promise<{ groups: Group[]; hasMore: boolean }> {
    const from = (page - 1) * limit
    const to = from + limit - 1
    const excludeIds = await this.getUserGroupIdsWithInvites(userId)

    let query = supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('member_count', { ascending: false })
      .range(from, to)

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', excludeIds)
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      groups: (data ?? []) as Group[],
      hasMore: (count ?? 0) > from + limit,
    }
  },

  async search(q: string, userId: string, page: number = 1, limit: number = 10): Promise<{ groups: Group[]; hasMore: boolean }> {
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

  // --- Invites ---

  async createInvite(groupId: string, invitedUserId: string, invitedBy: string): Promise<GroupInvite> {
    const { data, error } = await supabaseAdmin
      .from('group_invites')
      .insert({ group_id: groupId, invited_user_id: invitedUserId, invited_by: invitedBy, status: 'pending' })
      .select()
      .single()

    if (error) throw error
    return data as GroupInvite
  },

  async findPendingInvite(groupId: string, userId: string): Promise<GroupInvite | null> {
    const { data, error } = await supabaseAdmin
      .from('group_invites')
      .select('*')
      .eq('group_id', groupId)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) return null
    return data as GroupInvite | null
  },

  async listPendingInvites(userId: string): Promise<(GroupInvite & { group: Group; invited_by_name: string })[]> {
    const { data: invites, error: invError } = await supabaseAdmin
      .from('group_invites')
      .select('*')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (invError) throw invError

    if (!invites || invites.length === 0) return []

    const groupIds = (invites as any[]).map((i) => i.group_id)
    const inviterIds = (invites as any[]).map((i) => i.invited_by)

    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*')
      .in('id', groupIds)

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, name')
      .in('id', inviterIds)

    if (groupsError || profilesError) throw groupsError || profilesError

    const groupMap = {} as Record<string, Group>
    const profileMap = {} as Record<string, string>

    const groupList = groups ?? []
    const profileList = profiles ?? []

    for (const g of groupList) {
      groupMap[g.id] = g as Group
    }

    for (const p of profileList) {
      profileMap[p.id] = p.name
    }

    return (invites as any[]).map((inv) => ({
      id: inv.id,
      group_id: inv.group_id,
      invited_user_id: inv.invited_user_id,
      invited_by: inv.invited_by,
      status: inv.status,
      created_at: inv.created_at,
      group: groupMap[inv.group_id] || ({} as Group),
      invited_by_name: profileMap[inv.invited_by] || 'Alguém',
    }))
  },

  async acceptInvite(inviteId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('group_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId)

    if (error) throw error
  },

  async rejectInvite(inviteId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('group_invites')
      .update({ status: 'rejected' })
      .eq('id', inviteId)

    if (error) throw error
  },

  async searchUsersForGroup(query: string, groupId: string): Promise<{ id: string; name: string; avatar_url: string | null; previousInviteStatus?: 'rejected' | 'pending' }[]> {
    const { data: members } = await supabaseAdmin
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    const memberIds = (members ?? []).map((m: any) => m.user_id)

    const { data: allInvites } = await supabaseAdmin
      .from('group_invites')
      .select('invited_user_id, status')
      .eq('group_id', groupId)

    const pendingInviteIds = (allInvites ?? []).filter((i: any) => i.status === 'pending').map((i: any) => i.invited_user_id)
    const rejectedInviteMap: { [key: string]: boolean } = {}
    ;(allInvites ?? []).filter((i: any) => i.status === 'rejected').forEach((i: any) => {
      rejectedInviteMap[i.invited_user_id] = true
    })

    const excludeSet = new Set([...memberIds, ...pendingInviteIds])

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url')
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) throw error

    return ((profiles ?? []) as any[]).filter((p) => !excludeSet.has(p.id)).map((p) => ({
      ...p,
      previousInviteStatus: rejectedInviteMap[p.id] ? 'rejected' : undefined,
    })) as { id: string; name: string; avatar_url: string | null; previousInviteStatus?: 'rejected' | 'pending' }[]
  },

  async update(groupId: string, input: UpdateGroupInput): Promise<Group> {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .update(input)
      .eq('id', groupId)
      .select()
      .single()

    if (error) throw error
    return data as Group
  },

  async delete(groupId: string): Promise<void> {
    const groupPosts = await Post.find({ groupId }).select('_id').lean()
    const postIds = groupPosts.map((p: any) => p._id)

    if (postIds.length > 0) {
      const comments = await Comment.find({ postId: { $in: postIds } }).select('_id').lean()
      const commentIds = comments.map((c: any) => c._id)
      if (commentIds.length > 0) {
        await CommentLike.deleteMany({ commentId: { $in: commentIds } })
      }
      await Comment.deleteMany({ postId: { $in: postIds } })
      await Like.deleteMany({ postId: { $in: postIds } })
      await Post.deleteMany({ _id: { $in: postIds } })
    }

    await supabaseAdmin.from('group_members').delete().eq('group_id', groupId)
    await supabaseAdmin.from('group_invites').delete().eq('group_id', groupId)
    await supabaseAdmin.from('groups').delete().eq('id', groupId)
  },

  async getMembers(groupId: string): Promise<(GroupMember & { name: string; avatar_url: string | null })[]> {
    const { data, error } = await supabaseAdmin
      .from('group_members')
      .select('*, profile:profiles(name, avatar_url)')
      .eq('group_id', groupId)

    if (error) throw error

    return ((data ?? []) as any[]).map((m: any) => ({
      id: m.id,
      group_id: m.group_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      name: m.profile?.name ?? 'Usuário',
      avatar_url: m.profile?.avatar_url ?? null,
    }))
  },
}
