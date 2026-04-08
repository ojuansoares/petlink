import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { api } from '../../api/axios'

export interface Pet {
  id: string
  owner_id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  photo_url: string | null
  allergies: string | null
  temperament: string | null
  observations: string | null
  is_active?: boolean
  created_at?: string
}

export interface CreatePetPayload {
  name: string
  species: string
  breed?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  photo_url?: string | null
  allergies?: string | null
  temperament?: string | null
  observations?: string | null
}

interface PetsState {
  list: Pet[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  error: string | null
}

const initialState: PetsState = {
  list: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
}

export const fetchPetsThunk = createAsyncThunk(
  'pets/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/pets')
      return (data?.pets ?? []) as Pet[]
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
      return data.pet as Pet
    } catch (err: any) {
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
      return data.pet as Pet
    } catch (err: any) {
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
      return petId
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error ?? err.response?.data?.message
        if (message) return rejectWithValue(message)
      }
      return rejectWithValue('Erro ao deletar pet')
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

    builder.addCase(deletePetThunk.fulfilled, (s, a) => {
      s.list = s.list.filter((pet) => pet.id !== a.payload)
    })
  },
})

export const { clearPetError } = petsSlice.actions
export default petsSlice.reducer

export const selectPetsList = (s: any): Pet[] => s.pets.list
export const selectPetsLoading = (s: any): boolean => s.pets.isLoading
export const selectPetsCreating = (s: any): boolean => s.pets.isCreating
export const selectPetsUpdating = (s: any): boolean => s.pets.isUpdating
export const selectPetsError = (s: any): string | null => s.pets.error
