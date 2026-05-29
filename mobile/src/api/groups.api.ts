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

export interface GroupDetails extends Group {
  my_role: 'owner' | 'admin' | 'member' | null
  members: {
    id: string
    group_id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    joined_at: string
    name: string
    avatar_url: string | null
  }[]
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

  async create(input: { name: string; description?: string; species?: string; is_public?: boolean }): Promise<Group> {
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
}
