import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export interface Pet {
  id:           string
  ownerId:      string
  name:         string
  species:      'dog' | 'cat' | 'bird' | 'other'
  breed:        string | null
  birthDate:    string | null  // ISO date
  weightKg:     number | null
  photoUrl:     string | null
  allergies:    string | null
  temperament:  string | null
  observations: string | null
  isActive:     boolean
  createdAt:    string
}

export interface WeightRecord {
  id:         string
  petId:      string
  weightKg:   number
  recordedAt: string
  notes:      string | null
}

export interface VaccineRecord {
  id:          string
  petId:       string
  name:        string
  type:        'vaccine' | 'dewormer'
  appliedAt:   string
  nextDoseAt:  string | null
  lab:         string | null
  vetName:     string | null
  notes:       string | null
  notified:    boolean
}

interface PetsState {
  list:            Pet[]
  selectedPetId:   string | null
  weightRecords:   Record<string, WeightRecord[]>  // petId → records
  vaccines:        Record<string, VaccineRecord[]> // petId → vaccines
  isLoading:       boolean
  isCreating:      boolean
  error:           string | null
}

// ─── Thunks ──────────────────────────────────────────────────
export const fetchPetsThunk = createAsyncThunk(
  'pets/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/pets')
      return data as Pet[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar pets')
    }
  }
)

export const createPetThunk = createAsyncThunk(
  'pets/create',
  async (payload: Omit<Pet, 'id' | 'ownerId' | 'isActive' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/pets', payload)
      return data as Pet
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao criar pet')
    }
  }
)

export const updatePetThunk = createAsyncThunk(
  'pets/update',
  async (payload: Partial<Pet> & { id: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/pets/${payload.id}`, payload)
      return data as Pet
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao atualizar pet')
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
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao deletar pet')
    }
  }
)

export const fetchWeightRecordsThunk = createAsyncThunk(
  'pets/fetchWeights',
  async (petId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/${petId}/weight`)
      return { petId, records: data as WeightRecord[] }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar pesos')
    }
  }
)

export const addWeightRecordThunk = createAsyncThunk(
  'pets/addWeight',
  async (payload: { petId: string; weightKg: number; recordedAt: string; notes?: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/pets/${payload.petId}/weight`, payload)
      return { petId: payload.petId, record: data as WeightRecord }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao registrar peso')
    }
  }
)

export const fetchVaccinesThunk = createAsyncThunk(
  'pets/fetchVaccines',
  async (petId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/pets/${petId}/vaccines`)
      return { petId, vaccines: data as VaccineRecord[] }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar vacinas')
    }
  }
)

export const addVaccineThunk = createAsyncThunk(
  'pets/addVaccine',
  async (
    payload: Omit<VaccineRecord, 'id' | 'notified'>,
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(`/pets/${payload.petId}/vaccines`, payload)
      return { petId: payload.petId, vaccine: data as VaccineRecord }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao registrar vacina')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: PetsState = {
  list:          [],
  selectedPetId: null,
  weightRecords: {},
  vaccines:      {},
  isLoading:     false,
  isCreating:    false,
  error:         null,
}

const petsSlice = createSlice({
  name: 'pets',
  initialState,
  reducers: {
    selectPet: (state, action: PayloadAction<string>) => {
      state.selectedPetId = action.payload
    },
    clearPetError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    // ── fetchAll ──
    builder
      .addCase(fetchPetsThunk.pending,   (s) => { s.isLoading = true; s.error = null })
      .addCase(fetchPetsThunk.fulfilled, (s, a) => {
        s.isLoading = false
        s.list      = a.payload
        // Seleciona o primeiro pet por padrão se não há selecionado
        if (!s.selectedPetId && a.payload.length > 0) {
          s.selectedPetId = a.payload[0].id
        }
      })
      .addCase(fetchPetsThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string })

    // ── create ──
    builder
      .addCase(createPetThunk.pending,   (s) => { s.isCreating = true })
      .addCase(createPetThunk.fulfilled, (s, a) => {
        s.isCreating = false
        s.list.push(a.payload)
        s.selectedPetId = a.payload.id
      })
      .addCase(createPetThunk.rejected, (s, a) => { s.isCreating = false; s.error = a.payload as string })

    // ── update ──
    builder
      .addCase(updatePetThunk.fulfilled, (s, a) => {
        const idx = s.list.findIndex(p => p.id === a.payload.id)
        if (idx !== -1) s.list[idx] = a.payload
      })

    // ── delete ──
    builder
      .addCase(deletePetThunk.fulfilled, (s, a) => {
        s.list = s.list.filter(p => p.id !== a.payload)
        if (s.selectedPetId === a.payload) {
          s.selectedPetId = s.list[0]?.id ?? null
        }
      })

    // ── weights ──
    builder
      .addCase(fetchWeightRecordsThunk.fulfilled, (s, a) => {
        s.weightRecords[a.payload.petId] = a.payload.records
      })
      .addCase(addWeightRecordThunk.fulfilled, (s, a) => {
        const { petId, record } = a.payload
        if (!s.weightRecords[petId]) s.weightRecords[petId] = []
        s.weightRecords[petId].unshift(record)
      })

    // ── vaccines ──
    builder
      .addCase(fetchVaccinesThunk.fulfilled, (s, a) => {
        s.vaccines[a.payload.petId] = a.payload.vaccines
      })
      .addCase(addVaccineThunk.fulfilled, (s, a) => {
        const { petId, vaccine } = a.payload
        if (!s.vaccines[petId]) s.vaccines[petId] = []
        s.vaccines[petId].unshift(vaccine)
      })
  },
})

export const { selectPet, clearPetError } = petsSlice.actions
export default petsSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectPetsList         = (s: any): Pet[]          => s.pets.list
export const selectSelectedPetId    = (s: any): string | null  => s.pets.selectedPetId
export const selectSelectedPet      = (s: any): Pet | undefined =>
  s.pets.list.find((p: Pet) => p.id === s.pets.selectedPetId)
export const selectPetsLoading      = (s: any): boolean        => s.pets.isLoading
export const selectWeightRecords    = (petId: string) => (s: any): WeightRecord[] =>
  s.pets.weightRecords[petId] ?? []
export const selectVaccines         = (petId: string) => (s: any): VaccineRecord[] =>
  s.pets.vaccines[petId] ?? []