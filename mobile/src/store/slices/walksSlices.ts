import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import {
  fetchWalks,
  fetchWalkById,
  createWalk,
  updateWalk,
  deleteWalk,
  fetchWalkStats,
  type Walk,
  type WalkPoint,
  type WalkStats,
} from '../../api/walks.api'
import { walkQueueRepository } from '../../data/repositories/WalkQueueRepository'
import { fetchGamificationThunk } from './gamificationSlice'

const CACHE_PREFIX = 'petlink.walk.cache'

export type { Walk, WalkPoint, WalkStats }

interface ActiveWalk {
  petId: string
  petName: string
  startedAt: string
  route: WalkPoint[]
  distanceM: number
  maxSpeedKmh: number
  pausedAt: string | null
  totalPausedS: number
}

interface WalksState {
  list: Walk[]
  active: ActiveWalk | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  stats: WalkStats[]
  statsLoading: boolean
  statsError: boolean
}

const initialState: WalksState = {
  list: [],
  active: null,
  isLoading: false,
  isSaving: false,
  error: null,
  stats: [],
  statsLoading: false,
  statsError: false,
}

export const fetchWalksThunk = createAsyncThunk(
  'walks/fetchAll',
  async (petId: string, { rejectWithValue }) => {
    try {
      const data = await fetchWalks(petId)
      const last3 = data.slice(0, 3)
      await AsyncStorage.setItem(`${CACHE_PREFIX}.list.${petId}`, JSON.stringify(last3))
      return data as Walk[]
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}.list.${petId}`)
      if (cached) return JSON.parse(cached) as Walk[]
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar passeios')
    }
  }
)

export const fetchWalkByIdThunk = createAsyncThunk(
  'walks/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await fetchWalkById(id)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar passeio')
    }
  }
)

export const saveWalkThunk = createAsyncThunk(
  'walks/save',
  async (payload: Omit<Walk, 'id' | 'createdAt'>, { rejectWithValue, dispatch }) => {
    try {
      const walk = await createWalk(payload)
      // Refresh gamification (XP + achievements) after walk is saved
      dispatch(fetchGamificationThunk())
      return walk
    } catch (err: any) {
      if (err.isOffline) {
        await walkQueueRepository.enqueue(payload)
        return {} as Walk
      }
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao salvar passeio')
    }
  }
)

export const updateWalkThunk = createAsyncThunk(
  'walks/update',
  async ({ id, data }: { id: string; data: { photoUrl?: string; notes?: string; title?: string; color?: string; location?: string } }, { rejectWithValue }) => {
    try {
      return await updateWalk(id, data)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao atualizar passeio')
    }
  }
)

export const deleteWalkThunk = createAsyncThunk(
  'walks/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteWalk(id)
      return id
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar passeio')
    }
  }
)

export const fetchWalkStatsThunk = createAsyncThunk(
  'walks/fetchStats',
  async ({ petId, start, end }: { petId: string; start: string; end: string }, { rejectWithValue }) => {
    try {
      return await fetchWalkStats(petId, start, end)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar estatísticas')
    }
  }
)

export const processWalkQueueThunk = createAsyncThunk(
  'walks/processQueue',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      let count = 0
      await walkQueueRepository.processQueue(async (payload) => {
        await createWalk(payload)
        count++
      })
      if (count > 0) {
        dispatch(fetchGamificationThunk())
      }
      return count
    } catch (err: any) {
      return rejectWithValue(err.message)
    }
  }
)

const walksSlice = createSlice({
  name: 'walks',
  initialState,
  reducers: {
    startWalk: (state, action: PayloadAction<{ petId: string; petName: string }>) => {
      state.active = {
        petId: action.payload.petId,
        petName: action.payload.petName,
        startedAt: new Date().toISOString(),
        route: [],
        distanceM: 0,
        maxSpeedKmh: 0,
        pausedAt: null,
        totalPausedS: 0,
      }
    },

    addRoutePoint: (state, action: PayloadAction<WalkPoint & { distanceDelta: number }>) => {
      if (!state.active) return
      state.active.route.push({
        lat: action.payload.lat,
        lng: action.payload.lng,
        timestamp: action.payload.timestamp,
      })
      state.active.distanceM += action.payload.distanceDelta
    },

    updateMaxSpeed: (state, action: PayloadAction<number>) => {
      if (!state.active) return
      if (action.payload > state.active.maxSpeedKmh) {
        state.active.maxSpeedKmh = action.payload
      }
    },

    pauseWalk: (state) => {
      if (!state.active) return
      state.active.pausedAt = new Date().toISOString()
    },

    resumeWalk: (state) => {
      if (!state.active || !state.active.pausedAt) return
      const pausedDuration = Date.now() - new Date(state.active.pausedAt).getTime()
      state.active.totalPausedS += pausedDuration / 1000
      state.active.pausedAt = null
    },

    cancelWalk: (state) => {
      state.active = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalksThunk.pending, (s) => { s.isLoading = true; s.error = null })
      .addCase(fetchWalksThunk.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload })
      .addCase(fetchWalksThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string })

    builder
      .addCase(saveWalkThunk.pending, (s) => { s.isSaving = true })
      .addCase(saveWalkThunk.fulfilled, (s, a) => {
        s.isSaving = false
        s.active = null
        if (a.payload?.id) {
          s.list.unshift(a.payload)
        }
      })
      .addCase(saveWalkThunk.rejected, (s, a) => { s.isSaving = false; s.error = a.payload as string })

    builder
      .addCase(updateWalkThunk.fulfilled, (s, a) => {
        const idx = s.list.findIndex((w) => w.id === a.payload.id)
        if (idx >= 0) s.list[idx] = a.payload
      })

    builder
      .addCase(deleteWalkThunk.fulfilled, (s, a) => {
        s.list = s.list.filter((w) => w.id !== a.payload)
      })

    builder
      .addCase(fetchWalkStatsThunk.pending, (s) => { s.statsLoading = true; s.statsError = false })
      .addCase(fetchWalkStatsThunk.fulfilled, (s, a) => { s.statsLoading = false; s.stats = a.payload; s.statsError = false })
      .addCase(fetchWalkStatsThunk.rejected, (s) => { s.statsLoading = false; s.statsError = true })
  },
})

export const {
  startWalk, addRoutePoint, updateMaxSpeed,
  pauseWalk, resumeWalk, cancelWalk,
} = walksSlice.actions
export default walksSlice.reducer

export const selectWalksList = (s: any): Walk[] => s.walks.list
export const selectActiveWalk = (s: any): ActiveWalk | null => s.walks.active
export const selectIsWalking = (s: any): boolean => !!s.walks.active
export const selectWalksLoading = (s: any): boolean => s.walks.isLoading
export const selectWalkStats = (s: any): WalkStats[] => s.walks.stats
export const selectWalkStatsLoading = (s: any): boolean => s.walks.statsLoading
export const selectWalkStatsError = (s: any): boolean => s.walks.statsError
