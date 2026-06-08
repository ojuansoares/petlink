import { configureStore } from '@reduxjs/toolkit'
import walksReducer, {
  fetchWalksThunk,
  saveWalkThunk,
  updateWalkThunk,
  deleteWalkThunk,
  fetchWalkStatsThunk,
  processWalkQueueThunk,
  startWalk,
  addRoutePoint,
  updateMaxSpeed,
  pauseWalk,
  resumeWalk,
  cancelWalk,
  type Walk,
  type WalkStats,
} from '../src/store/slices/walksSlices'

const mockWalk: Walk = {
  id: 'w1',
  petId: 'p1',
  ownerId: 'u1',
  startedAt: '2026-06-07T10:00:00Z',
  endedAt: '2026-06-07T10:30:00Z',
  distanceM: 2500,
  durationS: 1800,
  stepsCount: null,
  avgSpeedKmh: 5,
  avgPaceMinKm: 12,
  maxSpeedKmh: 8.5,
  calories: 123,
  photoUrl: null,
  route: [{ lat: -23.5, lng: -46.6, timestamp: '2026-06-07T10:00:00Z' }],
  notes: null,
  title: 'Passeio matinal',
  color: '#22C55E',
  location: 'São Paulo, SP',
  createdAt: '2026-06-07T10:30:00Z',
}

jest.mock('../src/api/walks.api', () => ({
  fetchWalks: jest.fn(),
  fetchWalkById: jest.fn(),
  createWalk: jest.fn(),
  updateWalk: jest.fn(),
  deleteWalk: jest.fn(),
  fetchWalkStats: jest.fn(),
}))

jest.mock('../src/data/repositories/WalkQueueRepository', () => ({
  walkQueueRepository: {
    enqueue: jest.fn(),
    processQueue: jest.fn(),
  },
}))

jest.mock('../src/store/slices/gamificationSlice', () => ({
  fetchGamificationThunk: jest.fn(() => ({ type: 'gamification/fetch' })),
}))

const { fetchWalks, createWalk, updateWalk, deleteWalk, fetchWalkStats } = require('../src/api/walks.api')
const { walkQueueRepository } = require('../src/data/repositories/WalkQueueRepository')
const AsyncStorage = require('@react-native-async-storage/async-storage')

function createStore() {
  return configureStore({ reducer: { walks: walksReducer } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('walksSlice', () => {
  it('should return initial state', () => {
    const store = createStore()
    expect(store.getState().walks).toEqual({
      list: [],
      active: null,
      isLoading: false,
      isSaving: false,
      error: null,
      stats: [],
      statsLoading: false,
      statsError: false,
    })
  })

  describe('startWalk', () => {
    it('should initialize active walk', () => {
      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))

      const active = store.getState().walks.active
      expect(active).not.toBeNull()
      expect(active!.petId).toBe('p1')
      expect(active!.petName).toBe('Rex')
      expect(active!.route).toEqual([])
      expect(active!.distanceM).toBe(0)
      expect(active!.maxSpeedKmh).toBe(0)
      expect(active!.pausedAt).toBeNull()
      expect(active!.totalPausedS).toBe(0)
    })
  })

  describe('addRoutePoint', () => {
    it('should add point and increase distance', () => {
      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))

      store.dispatch(addRoutePoint({ lat: -23.5, lng: -46.6, timestamp: '2026-06-07T10:00:00Z', distanceDelta: 10 }))

      expect(store.getState().walks.active!.route).toHaveLength(1)
      expect(store.getState().walks.active!.distanceM).toBe(10)
    })
  })

  describe('updateMaxSpeed', () => {
    it('should track the highest speed', () => {
      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))

      store.dispatch(updateMaxSpeed(5))
      store.dispatch(updateMaxSpeed(8))
      store.dispatch(updateMaxSpeed(6))

      expect(store.getState().walks.active!.maxSpeedKmh).toBe(8)
    })
  })

  describe('pauseWalk / resumeWalk', () => {
    it('should accumulate paused time', () => {
      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))

      store.dispatch(pauseWalk())
      expect(store.getState().walks.active!.pausedAt).not.toBeNull()

      store.dispatch(resumeWalk())
      const active = store.getState().walks.active!
      expect(active.pausedAt).toBeNull()
      expect(active.totalPausedS).toBeGreaterThanOrEqual(0)
    })
  })

  describe('cancelWalk', () => {
    it('should clear active walk', () => {
      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))
      store.dispatch(cancelWalk())

      expect(store.getState().walks.active).toBeNull()
    })
  })

  describe('fetchWalksThunk', () => {
    it('should fetch and store walks', async () => {
      fetchWalks.mockResolvedValue([mockWalk])

      const store = createStore()
      await store.dispatch(fetchWalksThunk('p1'))

      const s = store.getState().walks
      expect(s.isLoading).toBe(false)
      expect(s.list).toHaveLength(1)
      expect(s.list[0].title).toBe('Passeio matinal')
    })

    it('should fallback to cache on error', async () => {
      fetchWalks.mockRejectedValue(new Error('offline'))
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify([mockWalk]))

      const store = createStore()
      await store.dispatch(fetchWalksThunk('p1'))

      expect(store.getState().walks.list).toHaveLength(1)
    })
  })

  describe('saveWalkThunk', () => {
    const payload = {
      petId: 'p1',
      ownerId: 'u1',
      startedAt: '2026-06-07T10:00:00Z',
      endedAt: '2026-06-07T10:30:00Z',
      distanceM: 2500,
      durationS: 1800,
      stepsCount: null,
      avgSpeedKmh: 5,
      avgPaceMinKm: 12,
      maxSpeedKmh: 8.5,
      calories: 123,
      photoUrl: null,
      route: [{ lat: -23.5, lng: -46.6, timestamp: '2026-06-07T10:00:00Z' }],
      notes: null,
      title: 'Passeio matinal',
      color: '#22C55E',
      location: 'São Paulo, SP',
    }

    it('should save walk and clear active', async () => {
      createWalk.mockResolvedValue(mockWalk)

      const store = createStore()
      store.dispatch(startWalk({ petId: 'p1', petName: 'Rex' }))
      await store.dispatch(saveWalkThunk(payload as any))

      const s = store.getState().walks
      expect(s.isSaving).toBe(false)
      expect(s.active).toBeNull()
      expect(s.list).toHaveLength(1)
      expect(s.list[0].id).toBe('w1')
    })

    it('should queue offline and return placeholder', async () => {
      createWalk.mockRejectedValue({ isOffline: true })

      const store = createStore()
      await store.dispatch(saveWalkThunk(payload as any))

      expect(walkQueueRepository.enqueue).toHaveBeenCalledWith(payload)
      expect(store.getState().walks.active).toBeNull()
    })
  })

  describe('updateWalkThunk', () => {
    it('should update walk in list', async () => {
      const updated = { ...mockWalk, title: 'Novo título' }
      updateWalk.mockResolvedValue(updated)

      const store = createStore()
      store.dispatch({ type: 'walks/fetchAll/fulfilled', payload: [mockWalk] })
      await store.dispatch(updateWalkThunk({ id: 'w1', data: { title: 'Novo título' } }))

      expect(store.getState().walks.list[0].title).toBe('Novo título')
    })
  })

  describe('deleteWalkThunk', () => {
    it('should remove walk from list', async () => {
      deleteWalk.mockResolvedValue(undefined)

      const store = createStore()
      store.dispatch({ type: 'walks/fetchAll/fulfilled', payload: [mockWalk] })
      await store.dispatch(deleteWalkThunk('w1'))

      expect(store.getState().walks.list).toHaveLength(0)
    })
  })

  describe('fetchWalkStatsThunk', () => {
    it('should fetch and store stats', async () => {
      const statsData: WalkStats[] = [{ started_at: '2026-06-07T10:00:00Z', distance_m: 2500, duration_s: 1800, calories: 123 }]
      fetchWalkStats.mockResolvedValue(statsData)

      const store = createStore()
      await store.dispatch(fetchWalkStatsThunk({ petId: 'p1', start: '2026-06-01', end: '2026-06-30' }))

      const s = store.getState().walks
      expect(s.statsLoading).toBe(false)
      expect(s.stats).toHaveLength(1)
    })
  })

  describe('processWalkQueueThunk', () => {
    it('should process queue and dispatch gamification', async () => {
      walkQueueRepository.processQueue.mockImplementation(async (processor: any) => {
        await processor({ title: 'offline walk' })
      })
      createWalk.mockResolvedValue(mockWalk)

      const store = createStore()
      const result = await store.dispatch(processWalkQueueThunk())

      expect(result.meta.requestStatus).toBe('fulfilled')
      expect(result.payload).toBe(1)
    })
  })
})
