import { api } from './axios'

export interface Group {
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
  role?: 'owner' | 'admin' | 'member'
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  name: string
  avatar_url: string | null
}

export interface GroupDetails extends Group {
  my_role: 'owner' | 'admin' | 'member' | null
  members: GroupMember[]
}

export interface GroupPost {
  id: string
  author_id: string
  pet_id?: string
  image_url?: string
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

export const groupsApi = {
  async listMyGroups(): Promise<Group[]> {
    const { data } = await api.get('/groups')
    return data as Group[]
  },

  async discover(page: number = 1, limit: number = 20): Promise<{ groups: Group[]; hasMore: boolean }> {
    const { data } = await api.get(`/groups/discover?page=${page}&limit=${limit}`)
    return data as { groups: Group[]; hasMore: boolean }
  },

  async search(q: string, page: number = 1, limit: number = 10): Promise<{ groups: Group[]; hasMore: boolean }> {
    const { data } = await api.get(`/groups/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`)
    return data as { groups: Group[]; hasMore: boolean }
  },

  async create(input: { name: string; description?: string; species?: string; is_public?: boolean; photo_url?: string }): Promise<Group> {
    const { data } = await api.post('/groups', input)
    return data as Group
  },

  async join(groupId: string): Promise<{ success: boolean }> {
    const { data } = await api.post(`/groups/${groupId}/join`)
    return data
  },

  async leave(groupId: string): Promise<{ success: boolean }> {
    const { data } = await api.post(`/groups/${groupId}/leave`)
    return data
  },

  async getDetails(groupId: string): Promise<GroupDetails> {
    const { data } = await api.get(`/groups/${groupId}`)
    return data as GroupDetails
  },

  async getPosts(groupId: string, page: number = 1, limit: number = 20): Promise<{ posts: GroupPost[]; hasMore: boolean }> {
    const { data } = await api.get(`/groups/${groupId}/posts?page=${page}&limit=${limit}`)
    return data as { posts: GroupPost[]; hasMore: boolean }
  },

  async deletePost(groupId: string, postId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/posts/${postId}`)
  },

  async togglePinPost(groupId: string, postId: string): Promise<{ post: GroupPost }> {
    const { data } = await api.patch(`/groups/${groupId}/posts/${postId}/pin`)
    return data
  },

  async changeMemberRole(groupId: string, userId: string, role: string): Promise<{ success: boolean }> {
    const { data } = await api.patch(`/groups/${groupId}/members/${userId}/role`, { role })
    return data
  },

  async removeMember(groupId: string, userId: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`)
    return data
  },
}
