import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

export type FeedingPlan = {
  id: string
  pet_id: string
  meal_name: string
  meal_time: string
  quantity: string | null
  order_index: number
  is_active: boolean
}

export type FeedingLog = {
  id: string
  pet_id: string
  meal_plan_id: string
  meal_name: string
  scheduled_time: string
  quantity: string | null
  order_index: number
  log_date: string
  checked_at: string | null
}

type FeedingState = {
  plan: FeedingPlan[]
  logs: FeedingLog[]
  isLoadingPlan: boolean
  isLoadingLogs: boolean
  isSaving: boolean
}

const initialState: FeedingState = {
  plan: [],
  logs: [],
  isLoadingPlan: false,
  isLoadingLogs: false,
  isSaving: false,
}

export const fetchFeedingPlanThunk = createAsyncThunk(
  'feeding/fetchPlan',
  async (petId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/${petId}/feeding/plan`)
      return data as FeedingPlan[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const saveFeedingPlanThunk = createAsyncThunk(
  'feeding/savePlan',
  async (
    { petId, meals }: { petId: string; meals: { id?: string; meal_name: string; meal_time: string; quantity?: string | null; order_index: number }[] },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(`/pets/${petId}/feeding/plan`, { meals })
      return data as FeedingPlan[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const fetchFeedingLogsThunk = createAsyncThunk(
  'feeding/fetchLogs',
  async ({ petId, date }: { petId: string; date: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/${petId}/feeding/logs?date=${date}`)
      return data as FeedingLog[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const checkMealThunk = createAsyncThunk(
  'feeding/checkMeal',
  async ({ petId, logId }: { petId: string; logId: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/pets/${petId}/feeding/logs/${logId}/check`)
      return data as FeedingLog
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

const feedingSlice = createSlice({
  name: 'feeding',
  initialState,
  reducers: {
    clearFeeding(state) {
      state.plan = []
      state.logs = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedingPlanThunk.pending, (s) => { s.isLoadingPlan = true })
      .addCase(fetchFeedingPlanThunk.fulfilled, (s, a) => { s.isLoadingPlan = false; s.plan = a.payload })
      .addCase(fetchFeedingPlanThunk.rejected, (s) => { s.isLoadingPlan = false })

      .addCase(saveFeedingPlanThunk.pending, (s) => { s.isSaving = true })
      .addCase(saveFeedingPlanThunk.fulfilled, (s, a) => { s.isSaving = false; s.plan = a.payload })
      .addCase(saveFeedingPlanThunk.rejected, (s) => { s.isSaving = false })

      .addCase(fetchFeedingLogsThunk.pending, (s) => { s.isLoadingLogs = true })
      .addCase(fetchFeedingLogsThunk.fulfilled, (s, a) => { s.isLoadingLogs = false; s.logs = a.payload })
      .addCase(fetchFeedingLogsThunk.rejected, (s) => { s.isLoadingLogs = false })

      .addCase(checkMealThunk.fulfilled, (s, a) => {
        const idx = s.logs.findIndex((l) => l.id === a.payload.id)
        if (idx >= 0) s.logs[idx] = a.payload
      })
  },
})

export const { clearFeeding } = feedingSlice.actions
export default feedingSlice.reducer

export const selectFeedingPlan = (s: any): FeedingPlan[] => s.feeding.plan
export const selectFeedingLogs = (s: any): FeedingLog[] => s.feeding.logs
export const selectFeedingLoading = (s: any): boolean => s.feeding.isLoadingLogs
export const selectFeedingSaving = (s: any): boolean => s.feeding.isSaving
