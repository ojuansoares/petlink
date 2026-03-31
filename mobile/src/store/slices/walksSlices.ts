import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export interface WalkPoint {
  lat:       number
  lng:       number
  timestamp: string
}

export interface Walk {
  id:           string
  petId:        string
  ownerId:      string
  startedAt:    string
  endedAt:      string | null
  distanceM:    number
  durationS:    number
  stepsCount:   number | null
  avgSpeedKmh:  number | null
  route:        WalkPoint[]
  notes:        string | null
  createdAt:    string
}

interface ActiveWalk {
  petId:     string
  startedAt: string
  route:     WalkPoint[]
  distanceM: number
  stepsCount: number
}

interface WalksState {
  list:       Walk[]
  active:     ActiveWalk | null   // passeio em andamento
  isLoading:  boolean
  isSaving:   boolean
  error:      string | null
}

// ─── Thunks ──────────────────────────────────────────────────
export const fetchWalksThunk = createAsyncThunk(
  'walks/fetchAll',
  async (petId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/walks?petId=${petId}`)
      return data as Walk[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar passeios')
    }
  }
)

export const saveWalkThunk = createAsyncThunk(
  'walks/save',
  async (payload: Omit<Walk, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/walks', payload)
      return data as Walk
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao salvar passeio')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: WalksState = {
  list:      [],
  active:    null,
  isLoading: false,
  isSaving:  false,
  error:     null,
}

const walksSlice = createSlice({
  name: 'walks',
  initialState,
  reducers: {
    startWalk: (state, action: PayloadAction<{ petId: string }>) => {
      state.active = {
        petId:      action.payload.petId,
        startedAt:  new Date().toISOString(),
        route:      [],
        distanceM:  0,
        stepsCount: 0,
      }
    },

    addRoutePoint: (state, action: PayloadAction<WalkPoint & { distanceDelta: number }>) => {
      if (!state.active) return
      state.active.route.push({
        lat:       action.payload.lat,
        lng:       action.payload.lng,
        timestamp: action.payload.timestamp,
      })
      state.active.distanceM += action.payload.distanceDelta
    },

    incrementSteps: (state, action: PayloadAction<number>) => {
      if (!state.active) return
      state.active.stepsCount += action.payload
    },

    cancelWalk: (state) => {
      state.active = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalksThunk.pending,   (s) => { s.isLoading = true })
      .addCase(fetchWalksThunk.fulfilled, (s, a) => { s.isLoading = false; s.list = a.payload })
      .addCase(fetchWalksThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string })

    builder
      .addCase(saveWalkThunk.pending,   (s) => { s.isSaving = true })
      .addCase(saveWalkThunk.fulfilled, (s, a) => {
        s.isSaving = false
        s.active   = null
        s.list.unshift(a.payload)
      })
      .addCase(saveWalkThunk.rejected, (s, a) => { s.isSaving = false; s.error = a.payload as string })
  },
})

export const { startWalk, addRoutePoint, incrementSteps, cancelWalk } = walksSlice.actions
export default walksSlice.reducer

export const selectWalksList       = (s: any): Walk[]           => s.walks.list
export const selectActiveWalk      = (s: any): ActiveWalk | null => s.walks.active
export const selectIsWalking       = (s: any): boolean          => !!s.walks.active
export const selectActiveDistance  = (s: any): number           => s.walks.active?.distanceM ?? 0
export const selectActiveSteps     = (s: any): number           => s.walks.active?.stepsCount ?? 0