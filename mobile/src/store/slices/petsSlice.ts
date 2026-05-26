import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../../api/axios'
import { PetsRepository, type OfflinePet } from '../../data/repositories/PetsRepository'
import { syncPetsFromApi } from '../../data/sync/syncPets'
import { readActivePetId, writeActivePetId } from '../../utils/petStorage'

export interface Pet {
  id: string
  owner_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  weight_history?: Array<{ weight: number; date: string }> | null
  photo_url: string | null
  allergies: string | null
  temperament: string | null
  observations: string | null
  tags: string[] | null
  is_active?: boolean
  created_at?: string
}

export interface CreatePetPayload {
  name: string
  species: string
  breed?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  weight_history?: Array<{ weight: number; date: string }> | null
  photo_url?: string | null
  allergies?: string | null
  temperament?: string | null
  observations?: string | null
  tags?: string[] | null
}

interface PetsState {
  list: Pet[]
  activePetId: string | null
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  publicPets: Pet[]
  publicPetsLoading: boolean
}

const initialState: PetsState = {
  list: [],
  activePetId: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  publicPets: [],
  publicPetsLoading: false,
}

export const fetchPetsThunk = createAsyncThunk(
  'pets/fetchAll',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const localPets = await PetsRepository.getAllWithWeightHistory()

      if (localPets.length > 0) {
        void syncPetsFromApi()
          .then((freshPets) => {
            dispatch(replacePetsFromSync(freshPets as Pet[]))
          })
          .catch(() => {
            // Sem rede: mantemos a leitura local sem interromper UX
          })

        return localPets as Pet[]
      }

      const freshPets = await syncPetsFromApi()
      return freshPets as Pet[]
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao buscar pets')
    }
  }
)

export const createPetThunk = createAsyncThunk(
  'pets/create',
  async (payload: CreatePetPayload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/pets', payload)
      const createdPet = data.pet as OfflinePet
      await PetsRepository.upsertFromRemote(createdPet)
      return createdPet as Pet
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao criar pet')
    }
  }
)

export const updatePetThunk = createAsyncThunk(
  'pets/update',
  async (payload: { id: string; patch: Partial<CreatePetPayload> }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/pets/${payload.id}`, payload.patch)
      const updatedPet = data.pet as OfflinePet
      await PetsRepository.upsertFromRemote(updatedPet)
      return updatedPet as Pet
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao atualizar pet')
    }
  }
)

export const deletePetThunk = createAsyncThunk(
  'pets/delete',
  async (petId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/pets/${petId}`)
      await PetsRepository.removeById(petId)
      return petId
    } catch (err: any) {
      if (err.isOffline) return rejectWithValue('Sem internet. Conecte-se para continuar.')
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao deletar pet')
    }
  }
)

export const hydrateActivePetThunk = createAsyncThunk(
  'pets/hydrateActiveId',
  async () => {
    return await readActivePetId()
  }
)

export const fetchPublicPetsThunk = createAsyncThunk(
  'pets/fetchPublic',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/user/${userId}`)
      return data.pets as Pet[]
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao buscar pets do usuário')
    }
  }
)

const petsSlice = createSlice({
  name: 'pets',
  initialState,
  reducers: {
    clearPetError: (state) => {
      state.error = null
    },
    setActivePetId: (state, action: PayloadAction<string | null>) => {
      state.activePetId = action.payload
      writeActivePetId(action.payload)
    },
    replacePetsFromSync: (state, action: PayloadAction<Pet[]>) => {
      state.list = action.payload
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPetsThunk.pending, (s) => {
        s.isLoading = true
        s.error = null
      })
      .addCase(fetchPetsThunk.fulfilled, (s, a) => {
        s.isLoading = false
        s.list = a.payload
      })
      .addCase(fetchPetsThunk.rejected, (s, a) => {
        s.isLoading = false
        s.error = a.payload as string
      })

    builder
      .addCase(createPetThunk.pending, (s) => {
        s.isCreating = true
        s.error = null
      })
      .addCase(createPetThunk.fulfilled, (s, a) => {
        s.isCreating = false
        s.list.unshift(a.payload)
      })
      .addCase(createPetThunk.rejected, (s, a) => {
        s.isCreating = false
        s.error = a.payload as string
      })

    builder
      .addCase(updatePetThunk.pending, (s) => {
        s.isUpdating = true
        s.error = null
      })
      .addCase(updatePetThunk.fulfilled, (s, a) => {
        s.isUpdating = false
        const index = s.list.findIndex((pet) => pet.id === a.payload.id)
        if (index >= 0) {
          s.list[index] = a.payload
        }
      })
      .addCase(updatePetThunk.rejected, (s, a) => {
        s.isUpdating = false
        s.error = a.payload as string
      })

    builder
      .addCase(deletePetThunk.pending, (s) => {
        s.isDeleting = true
        s.error = null
      })
      .addCase(deletePetThunk.fulfilled, (s, a) => {
        s.isDeleting = false
        s.list = s.list.filter((pet) => pet.id !== a.payload)
      })
      .addCase(deletePetThunk.rejected, (s, a) => {
        s.isDeleting = false
        s.error = a.payload as string
      })

    builder
      .addCase(hydrateActivePetThunk.fulfilled, (s, a) => {
        if (a.payload) {
          s.activePetId = a.payload
        }
      })

    builder
      .addCase(fetchPublicPetsThunk.pending, (s) => {
        s.publicPetsLoading = true
      })
      .addCase(fetchPublicPetsThunk.fulfilled, (s, a) => {
        s.publicPetsLoading = false
        s.publicPets = a.payload
      })
      .addCase(fetchPublicPetsThunk.rejected, (s) => {
        s.publicPetsLoading = false
      })
  },
})

export const { clearPetError, setActivePetId, replacePetsFromSync } = petsSlice.actions
export default petsSlice.reducer

export const selectPetsList = (s: any): Pet[] => s.pets.list
export const selectPetsLoading = (s: any): boolean => s.pets.isLoading
export const selectPetsCreating = (s: any): boolean => s.pets.isCreating
export const selectPetsUpdating = (s: any): boolean => s.pets.isUpdating
export const selectPetsDeleting = (s: any): boolean => s.pets.isDeleting
export const selectPetsError = (s: any): string | null => s.pets.error
export const selectActivePetId = (s: any): string | null => s.pets.activePetId
export const selectPublicPets = (s: any): Pet[] => s.pets.publicPets
export const selectPublicPetsLoading = (s: any): boolean => s.pets.publicPetsLoading
