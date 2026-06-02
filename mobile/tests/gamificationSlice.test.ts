import { configureStore } from '@reduxjs/toolkit'
import gamificationReducer, {
  fetchGamificationThunk,
  clearGamification,
  clearNewlyUnlocked,
  dismissLevelUp,
} from '../src/store/slices/gamificationSlice'

const mockStats = {
  totalXp: 1500,
  level: 5,
  currentXp: 200,
  nextLevelXp: 500,
  unlockedAchievements: [
    { id: 'ach-1', name: 'First Post', icon: 'star', unlockedAt: '2025-01-01' },
  ],
  nextAchievements: [
    { id: 'ach-2', name: '10 Posts', icon: 'trophy', progress: 0.3 },
  ],
}

jest.mock('../src/api/gamification.api', () => ({
  gamificationApi: {
    getMyStats: jest.fn(),
  },
}))

const { gamificationApi } = require('../src/api/gamification.api')

function createStore() {
  return configureStore({ reducer: { gamification: gamificationReducer } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('gamificationSlice', () => {
  it('should return initial state', () => {
    const store = createStore()
    expect(store.getState().gamification).toEqual({
      stats: null,
      lastLevel: 0,
      pendingLevelUp: null,
      newlyUnlockedIds: [],
      isLoading: false,
      error: null,
    })
  })

  describe('reducers', () => {
    it('clearGamification resets to initial', () => {
      const store = createStore()
      store.dispatch({ type: 'gamification/fetch/fulfilled', payload: mockStats })
      expect(store.getState().gamification.stats).toBeTruthy()

      store.dispatch(clearGamification())
      expect(store.getState().gamification).toEqual({
        stats: null,
        lastLevel: 0,
        pendingLevelUp: null,
        newlyUnlockedIds: [],
        isLoading: false,
        error: null,
      })
    })

    it('clearNewlyUnlocked empties the list', () => {
      const store = createStore()
      store.dispatch({ type: 'gamification/fetch/fulfilled', payload: mockStats })
      expect(store.getState().gamification.newlyUnlockedIds).not.toEqual([])

      store.dispatch(clearNewlyUnlocked())
      expect(store.getState().gamification.newlyUnlockedIds).toEqual([])
    })

    it('dismissLevelUp updates lastLevel and clears pendingLevelUp', () => {
      const store = createStore()
      store.dispatch({ type: 'gamification/fetch/fulfilled', payload: mockStats })

      store.dispatch(dismissLevelUp())
      const state = store.getState().gamification
      expect(state.lastLevel).toBe(5)
      expect(state.pendingLevelUp).toBeNull()
    })
  })

  describe('fetchGamificationThunk', () => {
    it('should fetch stats and not level up on first fetch (oldLevel=0)', async () => {
      gamificationApi.getMyStats.mockResolvedValue(mockStats)

      const store = createStore()
      await store.dispatch(fetchGamificationThunk())

      const state = store.getState().gamification
      expect(state.isLoading).toBe(false)
      expect(state.stats?.level).toBe(5)
      expect(state.lastLevel).toBe(0)
      expect(state.pendingLevelUp).toBeNull()
    })

    it('should not trigger level up on first fetch (lastLevel=0)', async () => {
      const stats = { ...mockStats, level: 1 }
      gamificationApi.getMyStats.mockResolvedValue(stats)

      const store = createStore()
      await store.dispatch(fetchGamificationThunk())

      const state = store.getState().gamification
      expect(state.pendingLevelUp).toBeNull()
    })

    it('should detect no level up when same level', async () => {
      gamificationApi.getMyStats.mockResolvedValue(mockStats)

      const store = createStore()
      await store.dispatch(fetchGamificationThunk())
      // stats now has level 5, lastLevel=0, pendingLevelUp=5
      await store.dispatch(dismissLevelUp())
      // lastLevel=5, pendingLevelUp=null

      gamificationApi.getMyStats.mockResolvedValue(mockStats)
      await store.dispatch(fetchGamificationThunk())

      const state = store.getState().gamification
      expect(state.pendingLevelUp).toBeNull()
    })

    it('should detect level up from 5 to 6', async () => {
      gamificationApi.getMyStats.mockResolvedValue(mockStats)

      const store = createStore()
      await store.dispatch(fetchGamificationThunk())
      store.dispatch(dismissLevelUp())

      const level6 = { ...mockStats, level: 6 }
      gamificationApi.getMyStats.mockResolvedValue(level6)
      await store.dispatch(fetchGamificationThunk())

      const state = store.getState().gamification
      expect(state.pendingLevelUp).toBe(6)
      expect(state.lastLevel).toBe(5)
    })

    it('should detect newly unlocked ids after subsequent fetch', async () => {
      const firstStats = { ...mockStats, unlockedAchievements: [{ id: 'ach-1', name: 'First Post', icon: 'star', unlockedAt: '2025-01-01' }] }
      gamificationApi.getMyStats.mockResolvedValue(firstStats)

      const store = createStore()
      await store.dispatch(fetchGamificationThunk())
      // first fetch: all achievements are "new" because old set was empty
      expect(store.getState().gamification.newlyUnlockedIds).toEqual(['ach-1'])

      store.dispatch(clearNewlyUnlocked())

      const secondStats = {
        ...mockStats,
        unlockedAchievements: [
          { id: 'ach-1', name: 'First Post', icon: 'star', unlockedAt: '2025-01-01' },
          { id: 'ach-2', name: '10 Posts', icon: 'trophy', unlockedAt: '2025-06-01' },
        ],
      }
      gamificationApi.getMyStats.mockResolvedValue(secondStats)
      await store.dispatch(fetchGamificationThunk())

      expect(store.getState().gamification.newlyUnlockedIds).toEqual(['ach-2'])
    })
  })
})
