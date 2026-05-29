import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { gamificationApi, type GamificationStats } from '../../api/gamification.api'

interface GamificationState {
  stats: GamificationStats | null
  lastLevel: number
  pendingLevelUp: number | null
  newlyUnlockedIds: string[]
  isLoading: boolean
  error: string | null
}

const initialState: GamificationState = {
  stats: null,
  lastLevel: 0,
  pendingLevelUp: null,
  newlyUnlockedIds: [],
  isLoading: false,
  error: null,
}

export const fetchGamificationThunk = createAsyncThunk(
  'gamification/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await gamificationApi.getMyStats()
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao carregar conquistas')
    }
  }
)

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    clearGamification: () => initialState,
    clearNewlyUnlocked: (s) => { s.newlyUnlockedIds = [] },
    dismissLevelUp: (s) => {
      s.lastLevel = s.stats?.level ?? 0
      s.pendingLevelUp = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGamificationThunk.pending, (s) => { s.isLoading = true; s.error = null })
      .addCase(fetchGamificationThunk.fulfilled, (s, a) => {
        s.isLoading = false
        const oldLevel = s.stats?.level ?? 0
        s.lastLevel = oldLevel
        const oldUnlocked = new Set(s.stats?.unlockedAchievements.map((a) => a.id) ?? [])
        s.newlyUnlockedIds = a.payload.unlockedAchievements
          .filter((ach) => !oldUnlocked.has(ach.id))
          .map((ach) => ach.id)
        s.stats = a.payload
        if (oldLevel > 0 && a.payload.level > oldLevel) {
          s.pendingLevelUp = a.payload.level
        }
      })
      .addCase(fetchGamificationThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string })
  },
})

export const { clearGamification, clearNewlyUnlocked, dismissLevelUp } = gamificationSlice.actions
export default gamificationSlice.reducer

export const selectGamification = (s: any) => s.gamification.stats as GamificationStats | null
export const selectNewlyUnlockedIds = (s: any) => s.gamification.newlyUnlockedIds as string[]
export const selectLastLevel = (s: any) => s.gamification.lastLevel as number
export const selectPendingLevelUp = (s: any) => s.gamification.pendingLevelUp as number | null
export const selectIsLoadingGamification = (s: any) => s.gamification.isLoading as boolean
