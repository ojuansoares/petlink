import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { groupsApi, type Group } from '../../api/groups.api'

interface GroupsState {
  myGroups: Group[]
  discoverGroups: Group[]
  discoverHasMore: boolean
  discoverPage: number
  isLoadingMy: boolean
  isLoadingDiscover: boolean
  isJoining: Record<string, boolean>
  error: string | null
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
  async (input: { name: string; description?: string; species?: string }, { rejectWithValue }) => {
    try {
      return await groupsApi.create(input)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao criar grupo')
    }
  }
)

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    clearGroups: () => initialState,
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
      })
      .addCase(joinGroupThunk.rejected, (s, a) => { s.isJoining[a.meta.arg] = false; s.error = a.payload as string })

      .addCase(leaveGroupThunk.pending, (s, a) => { s.isJoining[a.meta.arg] = true })
      .addCase(leaveGroupThunk.fulfilled, (s, a) => {
        s.isJoining[a.meta.arg] = false
        s.myGroups = s.myGroups.filter((g) => g.id !== a.payload)
      })
      .addCase(leaveGroupThunk.rejected, (s, a) => { s.isJoining[a.meta.arg] = false; s.error = a.payload as string })

      .addCase(createGroupThunk.fulfilled, (s, a) => { s.myGroups.unshift({ ...a.payload, role: 'owner' }) })
  },
})

export const { clearGroups } = groupsSlice.actions
export default groupsSlice.reducer

export const selectMyGroups = (s: any) => s.groups.myGroups as Group[]
export const selectDiscoverGroups = (s: any) => s.groups.discoverGroups as Group[]
export const selectDiscoverHasMore = (s: any) => s.groups.discoverHasMore as boolean
export const selectDiscoverPage = (s: any) => s.groups.discoverPage as number
export const selectIsLoadingMyGroups = (s: any) => s.groups.isLoadingMy as boolean
export const selectIsLoadingDiscover = (s: any) => s.groups.isLoadingDiscover as boolean
export const selectIsJoiningGroup = (groupId: string) => (s: any) => s.groups.isJoining[groupId] ?? false
