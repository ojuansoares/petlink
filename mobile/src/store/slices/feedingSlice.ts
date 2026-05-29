import AsyncStorage from '@react-native-async-storage/async-storage'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../api/axios'
import { feedingQueueRepository } from '../../data/repositories/FeedingQueueRepository'

const CACHE_PREFIX = 'petlink.feeding.cache'

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

export type DayScore = {
  date: string
  total: number
  completed: number
}

type FeedingState = {
  plan: FeedingPlan[]
  logs: FeedingLog[]
  score: DayScore[]
  isLoadingPlan: boolean
  isLoadingLogs: boolean
  isLoadingScore: boolean
  isSaving: boolean
}

const initialState: FeedingState = {
  plan: [],
  logs: [],
  score: [],
  isLoadingPlan: false,
  isLoadingLogs: false,
  isLoadingScore: false,
  isSaving: false,
}

export const fetchFeedingPlanThunk = createAsyncThunk(
  'feeding/fetchPlan',
  async (petId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/${petId}/feeding/plan`)
      await AsyncStorage.setItem(`${CACHE_PREFIX}.plan.${petId}`, JSON.stringify(data))
      return data as FeedingPlan[]
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}.plan.${petId}`)
      if (cached) return JSON.parse(cached) as FeedingPlan[]
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
      await AsyncStorage.setItem(`${CACHE_PREFIX}.plan.${petId}`, JSON.stringify(data))
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
      await AsyncStorage.setItem(`${CACHE_PREFIX}.logs.${petId}.${date}`, JSON.stringify(data))
      return data as FeedingLog[]
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}.logs.${petId}.${date}`)
      if (cached) return JSON.parse(cached) as FeedingLog[]
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const checkMealThunk = createAsyncThunk(
  'feeding/checkMeal',
  async ({ petId, logId, checked }: { petId: string; logId: string; checked: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/pets/${petId}/feeding/logs/${logId}/check`, { checked })
      return data as FeedingLog
    } catch (err: any) {
      if (err.isOffline) {
        await feedingQueueRepository.add(logId, petId, checked)
        return { id: logId, pet_id: petId, checked_at: checked ? new Date().toISOString() : null, meal_plan_id: '', meal_name: '', scheduled_time: '', quantity: null, order_index: 0, log_date: '' } as FeedingLog
      }
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const deactivateFeedingPlanThunk = createAsyncThunk(
  'feeding/deactivatePlan',
  async (petId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/pets/${petId}/feeding/plan`)
      await AsyncStorage.removeItem(`${CACHE_PREFIX}.plan.${petId}`)
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro')
    }
  }
)

export const fetchFeedingScoreThunk = createAsyncThunk(
  'feeding/fetchScore',
  async ({ petId, start, end }: { petId: string; start: string; end: string }, { rejectWithValue }) => {
    const cacheKey = `${CACHE_PREFIX}.score.${petId}.${start}.${end}`
    try {
      const { data } = await api.get(`/pets/${petId}/feeding/score?start=${start}&end=${end}`)
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data))
      return data as DayScore[]
    } catch (err: any) {
      const cached = await AsyncStorage.getItem(cacheKey)
      if (cached) return JSON.parse(cached) as DayScore[]
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
      state.score = []
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
        if (idx >= 0) s.logs[idx] = { ...s.logs[idx], checked_at: a.payload.checked_at }
      })

      .addCase(fetchFeedingScoreThunk.pending, (s) => { s.isLoadingScore = true })
      .addCase(fetchFeedingScoreThunk.fulfilled, (s, a) => { s.isLoadingScore = false; s.score = a.payload })
      .addCase(fetchFeedingScoreThunk.rejected, (s) => { s.isLoadingScore = false })

      .addCase(deactivateFeedingPlanThunk.fulfilled, (s) => {
        s.plan = []
        s.logs = []
        s.score = []
      })
  },
})

export const { clearFeeding } = feedingSlice.actions
export default feedingSlice.reducer

export const selectFeedingPlan = (s: any): FeedingPlan[] => s.feeding.plan
export const selectFeedingPlanLoading = (s: any): boolean => s.feeding.isLoadingPlan
export const selectFeedingLogs = (s: any): FeedingLog[] => s.feeding.logs
export const selectFeedingLoading = (s: any): boolean => s.feeding.isLoadingLogs
export const selectFeedingSaving = (s: any): boolean => s.feeding.isSaving
export const selectFeedingScore = (s: any): DayScore[] => s.feeding.score
export const selectFeedingScoreLoading = (s: any): boolean => s.feeding.isLoadingScore
