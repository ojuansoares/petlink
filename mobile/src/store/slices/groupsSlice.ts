import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { groupsApi, type Group, type GroupPost, type GroupMember, type GroupInvite } from '../../api/groups.api'
import { api } from '../../api/axios'

interface GroupsState {
  myGroups: Group[]
  discoverGroups: Group[]
  discoverHasMore: boolean
  discoverPage: number
  isLoadingMy: boolean
  isLoadingDiscover: boolean
  isJoining: Record<string, boolean>
  error: string | null

  groupPosts: Record<string, GroupPost[]>
  groupPostsHasMore: Record<string, boolean>
  groupPostsPage: Record<string, number>
  isLoadingGroupPosts: Record<string, boolean>
  isLoadingMoreGroupPosts: Record<string, boolean>

  groupMembers: Record<string, GroupMember[]>
  myRoles: Record<string, 'owner' | 'admin' | 'member' | null>
  isChangingRole: Record<string, boolean>

  pendingInvites: GroupInvite[]
  isLoadingInvites: boolean
}

const initialState: GroupsState = {
  myGroups: [],
  discoverGroups: [],
  discoverHasMore: false,
  discoverPage: 1,
  isLoadingMy: false,
  isLoadingDiscover: false,
  isJoining: {},
  error: null,

  groupPosts: {},
  groupPostsHasMore: {},
  groupPostsPage: {},
  isLoadingGroupPosts: {},
  isLoadingMoreGroupPosts: {},

  groupMembers: {},
  myRoles: {},
  isChangingRole: {},

  pendingInvites: [],
  isLoadingInvites: false,
}

export const fetchMyGroupsThunk = createAsyncThunk(
  'groups/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      return await groupsApi.listMyGroups()
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar grupos')
    }
  }
)

export const fetchDiscoverGroupsThunk = createAsyncThunk(
  'groups/fetchDiscover',
  async (page: number, { rejectWithValue }) => {
    try {
      return await groupsApi.discover(page)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar grupos')
    }
  }
)

export const joinGroupThunk = createAsyncThunk(
  'groups/join',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsApi.join(groupId)
      return groupId
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao entrar no grupo')
    }
  }
)

export const leaveGroupThunk = createAsyncThunk(
  'groups/leave',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsApi.leave(groupId)
      return groupId
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao sair do grupo')
    }
  }
)

export const createGroupThunk = createAsyncThunk(
  'groups/create',
  async (input: { name: string; description?: string; species?: string; photo_url?: string; location?: string }, { rejectWithValue }) => {
    try {
      return await groupsApi.create(input)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao criar grupo')
    }
  }
)

export const fetchGroupPostsThunk = createAsyncThunk(
  'groups/fetchPosts',
  async (groupId: string, { rejectWithValue }) => {
    try {
      return await groupsApi.getPosts(groupId, 1)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar posts do grupo')
    }
  }
)

export const fetchMoreGroupPostsThunk = createAsyncThunk(
  'groups/fetchMorePosts',
  async (payload: { groupId: string; page: number }, { rejectWithValue }) => {
    try {
      return await groupsApi.getPosts(payload.groupId, payload.page)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar mais posts')
    }
  }
)

export const createGroupPostThunk = createAsyncThunk(
  'groups/createPost',
  async (
    payload: { group_id: string; image_url?: string; caption?: string; pet_ids?: string[] },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post('/posts', payload)
      return { groupId: payload.group_id, post: data.post as GroupPost }
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao publicar no grupo')
    }
  }
)

export const deleteGroupPostThunk = createAsyncThunk(
  'groups/deletePost',
  async (payload: { groupId: string; postId: string }, { rejectWithValue }) => {
    try {
      await groupsApi.deletePost(payload.groupId, payload.postId)
      return payload
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar post')
    }
  }
)

export const pinGroupPostThunk = createAsyncThunk(
  'groups/pinPost',
  async (payload: { groupId: string; postId: string }, { rejectWithValue }) => {
    try {
      const { post } = await groupsApi.togglePinPost(payload.groupId, payload.postId)
      return { groupId: payload.groupId, post }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao fixar post')
    }
  }
)

export const changeMemberRoleThunk = createAsyncThunk(
  'groups/changeRole',
  async (payload: { groupId: string; userId: string; role: 'admin' | 'member' }, { rejectWithValue }) => {
    try {
      await groupsApi.changeMemberRole(payload.groupId, payload.userId, payload.role)
      return payload
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao alterar cargo')
    }
  }
)

export const fetchPendingInvitesThunk = createAsyncThunk(
  'groups/fetchPendingInvites',
  async (_, { rejectWithValue }) => {
    try {
      return await groupsApi.listPendingInvites()
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar convites')
    }
  }
)

export const acceptInviteThunk = createAsyncThunk(
  'groups/acceptInvite',
  async (invite: GroupInvite, { rejectWithValue }) => {
    try {
      await groupsApi.acceptInvite(invite.id)
      return invite
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao aceitar convite')
    }
  }
)

export const rejectInviteThunk = createAsyncThunk(
  'groups/rejectInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await groupsApi.rejectInvite(inviteId)
      return inviteId
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao recusar convite')
    }
  }
)

export const deleteGroupThunk = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await groupsApi.deleteGroup(groupId)
      return groupId
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar grupo')
    }
  }
)

export const updateGroupThunk = createAsyncThunk(
  'groups/updateGroup',
  async (payload: { groupId: string; input: { name?: string; description?: string; photo_url?: string; species?: string; location?: string } }, { rejectWithValue }) => {
    try {
      const updated = await groupsApi.update(payload.groupId, payload.input)
      return { groupId: payload.groupId, group: updated }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao editar grupo')
    }
  }
)

export const removeMemberThunk = createAsyncThunk(
  'groups/removeMember',
  async (payload: { groupId: string; userId: string }, { rejectWithValue }) => {
    try {
      await groupsApi.removeMember(payload.groupId, payload.userId)
      return payload
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao remover membro')
    }
  }
)

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    clearGroups: () => initialState,
    setMyRole: (s, a: { payload: { groupId: string; role: 'owner' | 'admin' | 'member' | null } }) => {
      s.myRoles[a.payload.groupId] = a.payload.role
    },
    setGroupMembers: (s, a: { payload: { groupId: string; members: GroupMember[] } }) => {
      s.groupMembers[a.payload.groupId] = a.payload.members
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyGroupsThunk.pending, (s) => { s.isLoadingMy = true; s.error = null })
      .addCase(fetchMyGroupsThunk.fulfilled, (s, a) => { s.isLoadingMy = false; s.myGroups = a.payload })
      .addCase(fetchMyGroupsThunk.rejected, (s, a) => { s.isLoadingMy = false; s.error = a.payload as string })

      .addCase(fetchDiscoverGroupsThunk.pending, (s) => { s.isLoadingDiscover = true })
      .addCase(fetchDiscoverGroupsThunk.fulfilled, (s, a) => {
        s.isLoadingDiscover = false
        const { groups, hasMore } = a.payload
        if (a.meta.arg === 1) {
          s.discoverGroups = groups
        } else {
          s.discoverGroups = [...s.discoverGroups, ...groups]
        }
        s.discoverHasMore = hasMore
        s.discoverPage = a.meta.arg
      })
      .addCase(fetchDiscoverGroupsThunk.rejected, (s) => { s.isLoadingDiscover = false })

      .addCase(joinGroupThunk.pending, (s, a) => { s.isJoining[a.meta.arg] = true })
      .addCase(joinGroupThunk.fulfilled, (s, a) => {
        s.isJoining[a.meta.arg] = false
        const group = s.discoverGroups.find((g) => g.id === a.payload)
        if (group) {
          s.myGroups.unshift({ ...group, role: 'member' })
          s.discoverGroups = s.discoverGroups.filter((g) => g.id !== a.payload)
        }
        s.myRoles[a.payload] = 'member'
      })
      .addCase(joinGroupThunk.rejected, (s, a) => { s.isJoining[a.meta.arg] = false; s.error = a.payload as string })

      .addCase(leaveGroupThunk.pending, (s, a) => { s.isJoining[a.meta.arg] = true })
      .addCase(leaveGroupThunk.fulfilled, (s, a) => {
        s.isJoining[a.meta.arg] = false
        s.myGroups = s.myGroups.filter((g) => g.id !== a.payload)
        delete s.myRoles[a.payload]
        delete s.groupPosts[a.payload]
        delete s.groupMembers[a.payload]
      })
      .addCase(leaveGroupThunk.rejected, (s, a) => { s.isJoining[a.meta.arg] = false; s.error = a.payload as string })

      .addCase(deleteGroupThunk.fulfilled, (s, a) => {
        s.myGroups = s.myGroups.filter((g) => g.id !== a.payload)
        delete s.myRoles[a.payload]
        delete s.groupPosts[a.payload]
        delete s.groupMembers[a.payload]
      })

      .addCase(createGroupThunk.pending, (s) => { s.isJoining['__create__'] = true })
      .addCase(createGroupThunk.fulfilled, (s, a) => {
        s.isJoining['__create__'] = false
        s.myGroups.unshift({ ...a.payload, role: 'owner' })
      })
      .addCase(createGroupThunk.rejected, (s) => { s.isJoining['__create__'] = false })

      .addCase(updateGroupThunk.fulfilled, (s, a) => {
        const { groupId, group } = a.payload
        const idx = s.myGroups.findIndex((g) => g.id === groupId)
        if (idx !== -1) s.myGroups[idx] = { ...s.myGroups[idx], ...group }
      })

      // --- Group posts ---
      .addCase(fetchGroupPostsThunk.pending, (s, a) => { s.isLoadingGroupPosts[a.meta.arg] = true })
      .addCase(fetchGroupPostsThunk.fulfilled, (s, a) => {
        const gid = a.meta.arg
        s.isLoadingGroupPosts[gid] = false
        s.groupPosts[gid] = a.payload.posts
        s.groupPostsHasMore[gid] = a.payload.hasMore
        s.groupPostsPage[gid] = 1
      })
      .addCase(fetchGroupPostsThunk.rejected, (s, a) => { s.isLoadingGroupPosts[a.meta.arg] = false })

      .addCase(fetchMoreGroupPostsThunk.pending, (s, a) => { s.isLoadingMoreGroupPosts[a.meta.arg.groupId] = true })
      .addCase(fetchMoreGroupPostsThunk.fulfilled, (s, a) => {
        const { groupId } = a.meta.arg
        s.isLoadingMoreGroupPosts[groupId] = false
        s.groupPosts[groupId] = [...(s.groupPosts[groupId] ?? []), ...a.payload.posts]
        s.groupPostsHasMore[groupId] = a.payload.hasMore
        s.groupPostsPage[groupId] = a.meta.arg.page
      })
      .addCase(fetchMoreGroupPostsThunk.rejected, (s, a) => { s.isLoadingMoreGroupPosts[a.meta.arg.groupId] = false })

      .addCase(createGroupPostThunk.fulfilled, (s, a) => {
        const { groupId, post } = a.payload
        s.groupPosts[groupId] = [post, ...(s.groupPosts[groupId] ?? [])]
      })

      .addCase(deleteGroupPostThunk.fulfilled, (s, a) => {
        const { groupId, postId } = a.payload
        if (s.groupPosts[groupId]) {
          s.groupPosts[groupId] = s.groupPosts[groupId].filter((p) => p.id !== postId)
        }
      })

      .addCase(pinGroupPostThunk.fulfilled, (s, a) => {
        const { groupId, post } = a.payload
        if (s.groupPosts[groupId]) {
          s.groupPosts[groupId] = s.groupPosts[groupId].map((p) =>
            p.id === post.id ? { ...p, is_pinned: post.is_pinned } : p
          )
        }
      })

      // --- Invites ---
      .addCase(fetchPendingInvitesThunk.pending, (s) => { s.isLoadingInvites = true })
      .addCase(fetchPendingInvitesThunk.fulfilled, (s, a) => { s.isLoadingInvites = false; s.pendingInvites = a.payload })
      .addCase(fetchPendingInvitesThunk.rejected, (s) => { s.isLoadingInvites = false })

      .addCase(acceptInviteThunk.fulfilled, (s, a) => {
        s.pendingInvites = s.pendingInvites.filter((i) => i.id !== a.payload.id)
        s.myGroups.unshift({ ...a.payload.group, role: 'member' })
        s.myRoles[a.payload.group_id] = 'member'
      })

      .addCase(rejectInviteThunk.fulfilled, (s, a) => {
        s.pendingInvites = s.pendingInvites.filter((i) => i.id !== a.payload)
      })

      // --- Member management ---
      .addCase(changeMemberRoleThunk.pending, (s, a) => { s.isChangingRole[a.meta.arg.userId] = true })
      .addCase(changeMemberRoleThunk.fulfilled, (s, a) => {
        const { groupId, userId, role } = a.payload
        s.isChangingRole[userId] = false
        if (s.groupMembers[groupId]) {
          s.groupMembers[groupId] = s.groupMembers[groupId].map((m) =>
            m.user_id === userId ? { ...m, role } : m
          )
        }
      })
      .addCase(changeMemberRoleThunk.rejected, (s, a) => { s.isChangingRole[a.meta.arg.userId] = false })

      .addCase(removeMemberThunk.fulfilled, (s, a) => {
        const { groupId, userId } = a.payload
        if (s.groupMembers[groupId]) {
          s.groupMembers[groupId] = s.groupMembers[groupId].filter((m) => m.user_id !== userId)
        }
      })
  },
})

export const { clearGroups, setMyRole, setGroupMembers } = groupsSlice.actions
export default groupsSlice.reducer

export const selectMyGroups = (s: any) => s.groups.myGroups as Group[]
export const selectDiscoverGroups = (s: any) => s.groups.discoverGroups as Group[]
export const selectDiscoverHasMore = (s: any) => s.groups.discoverHasMore as boolean
export const selectDiscoverPage = (s: any) => s.groups.discoverPage as number
export const selectIsLoadingMyGroups = (s: any) => s.groups.isLoadingMy as boolean
export const selectIsLoadingDiscover = (s: any) => s.groups.isLoadingDiscover as boolean
export const selectIsJoiningGroup = (groupId: string) => (s: any) => s.groups.isJoining[groupId] ?? false

const EMPTY_POSTS: GroupPost[] = []
const EMPTY_MEMBERS: GroupMember[] = []

export const selectGroupPosts = (groupId: string) => (s: any) => s.groups.groupPosts[groupId] ?? EMPTY_POSTS
export const selectGroupPostsHasMore = (groupId: string) => (s: any) => s.groups.groupPostsHasMore[groupId] ?? false
export const selectGroupPostsPage = (groupId: string) => (s: any) => s.groups.groupPostsPage[groupId] ?? 1
export const selectIsLoadingGroupPosts = (groupId: string) => (s: any) => s.groups.isLoadingGroupPosts[groupId] ?? false
export const selectIsLoadingMoreGroupPosts = (groupId: string) => (s: any) => s.groups.isLoadingMoreGroupPosts[groupId] ?? false

export const selectGroupMembers = (groupId: string) => (s: any) => s.groups.groupMembers[groupId] ?? EMPTY_MEMBERS
export const selectMyRole = (groupId: string) => (s: any) => s.groups.myRoles[groupId] ?? null
export const selectIsChangingRole = (userId: string) => (s: any) => s.groups.isChangingRole[userId] ?? false

export const selectPendingInvites = (s: any) => s.groups.pendingInvites as GroupInvite[]
export const selectIsLoadingInvites = (s: any) => s.groups.isLoadingInvites as boolean
