import { configureStore } from '@reduxjs/toolkit'
import type { FeedingPlan, FeedingLog, DayScore } from '../src/store/slices/feedingSlice'
import feedingReducer, {
  fetchFeedingPlanThunk,
  saveFeedingPlanThunk,
  fetchFeedingLogsThunk,
  checkMealThunk,
  deactivateFeedingPlanThunk,
  fetchFeedingScoreThunk,
  clearFeeding,
} from '../src/store/slices/feedingSlice'

const mockPlan: FeedingPlan[] = [
  { id: 'm1', pet_id: 'p1', meal_name: 'Café', meal_time: '08:00', quantity: '100g', order_index: 0, is_active: true },
  { id: 'm2', pet_id: 'p1', meal_name: 'Jantar', meal_time: '18:00', quantity: '150g', order_index: 1, is_active: true },
]

const mockLogs: FeedingLog[] = [
  { id: 'l1', pet_id: 'p1', meal_plan_id: 'm1', meal_name: 'Café', scheduled_time: '2025-01-01T08:00:00', quantity: '100g', order_index: 0, log_date: '2025-01-01', checked_at: null },
]

const mockScore: DayScore[] = [{ date: '2025-01-01', total: 2, completed: 1 }]

jest.mock('../src/api/axios', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('../src/data/repositories/FeedingQueueRepository', () => ({
  feedingQueueRepository: {
    add: jest.fn(),
  },
}))

const { api } = require('../src/api/axios')
const AsyncStorage = require('@react-native-async-storage/async-storage')

function createStore() {
  return configureStore({ reducer: { feeding: feedingReducer } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('feedingSlice', () => {
  it('should return initial state', () => {
    const store = createStore()
    expect(store.getState().feeding).toEqual({
      plan: [],
      logs: [],
      score: [],
      isLoadingPlan: false,
      isLoadingLogs: false,
      isLoadingScore: false,
      isSaving: false,
      fetchError: false,
    })
  })

  describe('clearFeeding', () => {
    it('should reset plan, logs and score', () => {
      const store = createStore()
      store.dispatch({ type: 'feeding/fetchPlan/fulfilled', payload: mockPlan })
      store.dispatch({ type: 'feeding/fetchLogs/fulfilled', payload: mockLogs })
      store.dispatch({ type: 'feeding/fetchScore/fulfilled', payload: mockScore })

      store.dispatch(clearFeeding())
      const s = store.getState().feeding
      expect(s.plan).toEqual([])
      expect(s.logs).toEqual([])
      expect(s.score).toEqual([])
    })
  })

  describe('fetchFeedingPlanThunk', () => {
    it('should fetch and store plan', async () => {
      api.get.mockResolvedValue({ data: mockPlan })

      const store = createStore()
      await store.dispatch(fetchFeedingPlanThunk('p1'))

      const s = store.getState().feeding
      expect(s.isLoadingPlan).toBe(false)
      expect(s.plan).toEqual(mockPlan)
    })

    it('should fallback to cache on error', async () => {
      api.get.mockRejectedValue(new Error('offline'))
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockPlan))

      const store = createStore()
      await store.dispatch(fetchFeedingPlanThunk('p1'))

      const s = store.getState().feeding
      expect(s.plan).toEqual(mockPlan)
    })
  })

  describe('saveFeedingPlanThunk', () => {
    it('should save and update plan', async () => {
      api.post.mockResolvedValue({ data: mockPlan })

      const store = createStore()
      await store.dispatch(saveFeedingPlanThunk({ petId: 'p1', meals: [{ meal_name: 'Café', meal_time: '08:00', order_index: 0 }] }))

      const s = store.getState().feeding
      expect(s.isSaving).toBe(false)
      expect(s.plan).toEqual(mockPlan)
    })

    it('should send today parameter when provided', async () => {
      api.post.mockResolvedValue({ data: mockPlan })

      const store = createStore()
      await store.dispatch(saveFeedingPlanThunk({
        petId: 'p1',
        today: '2026-06-07',
        meals: [{ meal_name: 'Café', meal_time: '08:00', order_index: 0 }],
      }))

      expect(api.post).toHaveBeenCalledWith('/pets/p1/feeding/plan', {
        meals: [{ meal_name: 'Café', meal_time: '08:00', order_index: 0 }],
        today: '2026-06-07',
      })
    })
  })

  describe('fetchFeedingLogsThunk', () => {
    it('should fetch and store logs', async () => {
      api.get.mockResolvedValue({ data: mockLogs })

      const store = createStore()
      await store.dispatch(fetchFeedingLogsThunk({ petId: 'p1', date: '2025-01-01' }))

      const s = store.getState().feeding
      expect(s.isLoadingLogs).toBe(false)
      expect(s.logs).toEqual(mockLogs)
    })

    it('should fallback to cache on error', async () => {
      api.get.mockRejectedValue(new Error('offline'))
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockLogs))

      const store = createStore()
      await store.dispatch(fetchFeedingLogsThunk({ petId: 'p1', date: '2025-01-01' }))

      const s = store.getState().feeding
      expect(s.logs).toEqual(mockLogs)
    })
  })

  describe('checkMealThunk', () => {
    const log: FeedingLog = { id: 'l1', pet_id: 'p1', meal_plan_id: 'm1', meal_name: 'Café', scheduled_time: '2025-01-01T08:00:00', quantity: '100g', order_index: 0, log_date: '2025-01-01', checked_at: null }

    it('should update checked_at on check', async () => {
      const store = createStore()
      store.dispatch({ type: 'feeding/fetchLogs/fulfilled', payload: [log] })

      const updated = { ...log, checked_at: '2025-01-01T08:30:00' }
      api.post.mockResolvedValue({ data: updated })

      await store.dispatch(checkMealThunk({ petId: 'p1', logId: 'l1', checked: true }))

      expect(store.getState().feeding.logs[0].checked_at).toBe('2025-01-01T08:30:00')
    })

    it('should queue offline check when network fails', async () => {
      const store = createStore()
      store.dispatch({ type: 'feeding/fetchLogs/fulfilled', payload: [log] })

      api.post.mockRejectedValue({ isOffline: true })

      await store.dispatch(checkMealThunk({ petId: 'p1', logId: 'l1', checked: true }))

      const { feedingQueueRepository } = require('../src/data/repositories/FeedingQueueRepository')
      expect(feedingQueueRepository.add).toHaveBeenCalledWith('l1', 'p1', true)
    })
  })

  describe('fetchFeedingScoreThunk', () => {
    it('should fetch and store score', async () => {
      api.get.mockResolvedValue({ data: mockScore })

      const store = createStore()
      await store.dispatch(fetchFeedingScoreThunk({ petId: 'p1', start: '2025-01-01', end: '2025-01-07' }))

      const s = store.getState().feeding
      expect(s.isLoadingScore).toBe(false)
      expect(s.score).toEqual(mockScore)
    })
  })

  describe('deactivateFeedingPlanThunk', () => {
    it('should clear plan, logs and score', async () => {
      api.delete.mockResolvedValue({})

      const store = createStore()
      store.dispatch({ type: 'feeding/fetchPlan/fulfilled', payload: mockPlan })
      await store.dispatch(deactivateFeedingPlanThunk('p1'))

      const s = store.getState().feeding
      expect(s.plan).toEqual([])
    })
  })
})
