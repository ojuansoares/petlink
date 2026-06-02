import { configureStore } from '@reduxjs/toolkit'
import petsReducer, {
  fetchPetsThunk,
  createPetThunk,
  updatePetThunk,
  deletePetThunk,
  hydrateActivePetThunk,
  fetchPublicPetsThunk,
  clearPetError,
  setActivePetId,
  replacePetsFromSync,
} from '../src/store/slices/petsSlice'

const mockPet = {
  id: 'pet-1',
  owner_id: 'user-1',
  name: 'Rex',
  species: 'dog',
  breed: null,
  birth_date: null,
  weight_kg: 10,
  weight_history: null,
  photo_url: null,
  allergies: null,
  temperament: null,
  observations: null,
  tags: [],
}

jest.mock('../src/api/axios', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('../src/data/repositories/PetsRepository', () => ({
  PetsRepository: {
    getAllWithWeightHistory: jest.fn(),
    upsertFromRemote: jest.fn(),
    removeById: jest.fn(),
    replaceAllFromRemote: jest.fn(),
  },
}))

jest.mock('../src/utils/petStorage', () => ({
  readActivePetId: jest.fn(),
  writeActivePetId: jest.fn(),
}))

const { api } = require('../src/api/axios')
const { PetsRepository } = require('../src/data/repositories/PetsRepository')
const { readActivePetId, writeActivePetId } = require('../src/utils/petStorage')

function createStore() {
  return configureStore({ reducer: { pets: petsReducer } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('petsSlice', () => {
  it('should return the initial state', () => {
    const store = createStore()
    expect(store.getState().pets).toEqual({
      list: [],
      activePetId: null,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      error: null,
      publicPets: [],
      publicPetsLoading: false,
    })
  })

  describe('reducers', () => {
    it('clearPetError', () => {
      const store = createStore()
      store.dispatch({ type: 'pets/fetchAll/rejected', payload: 'erro' })
      expect(store.getState().pets.error).toBe('erro')
      store.dispatch(clearPetError())
      expect(store.getState().pets.error).toBeNull()
    })

    it('setActivePetId', () => {
      const store = createStore()
      store.dispatch(setActivePetId('pet-1'))
      expect(store.getState().pets.activePetId).toBe('pet-1')
      expect(writeActivePetId).toHaveBeenCalledWith('pet-1')
    })

    it('replacePetsFromSync', () => {
      const store = createStore()
      store.dispatch(replacePetsFromSync([mockPet]))
      expect(store.getState().pets.list).toEqual([mockPet])
      expect(store.getState().pets.error).toBeNull()
    })
  })

  describe('fetchPetsThunk', () => {
    it('should fetch local pets and trigger background sync', async () => {
      PetsRepository.getAllWithWeightHistory.mockResolvedValue([mockPet])
      PetsRepository.replaceAllFromRemote.mockResolvedValue(undefined)
      jest.spyOn(require('../src/data/sync/syncPets'), 'syncPetsFromApi').mockResolvedValue([mockPet])

      const store = createStore()
      await store.dispatch(fetchPetsThunk())

      const state = store.getState().pets
      expect(state.isLoading).toBe(false)
      expect(state.list).toEqual([mockPet])
      expect(state.error).toBeNull()
    })

    it('should handle rejected state', async () => {
      PetsRepository.getAllWithWeightHistory.mockRejectedValue(new Error('fail'))

      const store = createStore()
      await store.dispatch(fetchPetsThunk())

      const state = store.getState().pets
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeTruthy()
    })
  })

  describe('createPetThunk', () => {
    it('should create a pet and add to list', async () => {
      api.post.mockResolvedValue({ data: { pet: mockPet } })
      PetsRepository.upsertFromRemote.mockResolvedValue(undefined)

      const store = createStore()
      await store.dispatch(createPetThunk({ name: 'Rex', species: 'dog' }))

      const state = store.getState().pets
      expect(state.isCreating).toBe(false)
      expect(state.list).toHaveLength(1)
      expect(state.list[0]).toEqual(mockPet)
      expect(PetsRepository.upsertFromRemote).toHaveBeenCalled()
    })

    it('should handle API error', async () => {
      api.post.mockRejectedValue({ isAxiosError: true, response: { data: { error: 'name required' } } })

      const store = createStore()
      await store.dispatch(createPetThunk({ name: '', species: 'dog' }))

      const state = store.getState().pets
      expect(state.isCreating).toBe(false)
      expect(state.error).toBe('name required')
    })
  })

  describe('updatePetThunk', () => {
    it('should update a pet in the list', async () => {
      const store = createStore()
      store.dispatch(replacePetsFromSync([mockPet]))

      const updated = { ...mockPet, name: 'Rex 2.0' }
      api.put.mockResolvedValue({ data: { pet: updated } })
      PetsRepository.upsertFromRemote.mockResolvedValue(undefined)

      await store.dispatch(updatePetThunk({ id: 'pet-1', patch: { name: 'Rex 2.0' } }))

      const state = store.getState().pets
      expect(state.isUpdating).toBe(false)
      expect(state.list[0].name).toBe('Rex 2.0')
    })
  })

  describe('deletePetThunk', () => {
    it('should delete a pet and remove from list', async () => {
      const store = createStore()
      store.dispatch(replacePetsFromSync([mockPet]))

      api.delete.mockResolvedValue({})
      PetsRepository.removeById.mockResolvedValue(undefined)

      await store.dispatch(deletePetThunk('pet-1'))

      const state = store.getState().pets
      expect(state.isDeleting).toBe(false)
      expect(state.list).toHaveLength(0)
    })
  })

  describe('hydrateActivePetThunk', () => {
    it('should set activePetId from storage', async () => {
      readActivePetId.mockResolvedValue('pet-1')

      const store = createStore()
      await store.dispatch(hydrateActivePetThunk())

      expect(store.getState().pets.activePetId).toBe('pet-1')
    })

    it('should not set if storage returns null', async () => {
      readActivePetId.mockResolvedValue(null)

      const store = createStore()
      await store.dispatch(hydrateActivePetThunk())

      expect(store.getState().pets.activePetId).toBeNull()
    })
  })

  describe('fetchPublicPetsThunk', () => {
    it('should fetch public pets', async () => {
      api.get.mockResolvedValue({ data: { pets: [mockPet] } })

      const store = createStore()
      await store.dispatch(fetchPublicPetsThunk('user-1'))

      const state = store.getState().pets
      expect(state.publicPetsLoading).toBe(false)
      expect(state.publicPets).toEqual([mockPet])
    })
  })
})
