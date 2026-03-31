import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export type LocationCategory = 'park' | 'petshop' | 'vet' | 'hotel' | 'beach' | 'other'

export interface PetLocation {
  id:           string
  name:         string
  category:     LocationCategory
  description:  string | null
  address:      string
  lat:          number
  lng:          number
  photoUrl:     string | null
  avgRating:    number
  reviewsCount: number
  addedBy:      string
  createdAt:    string
  distanceKm:   number | null  // calculado pelo backend com base na posição do usuário
}

export interface LocationReview {
  id:         string
  locationId: string
  authorId:   string
  authorName: string
  rating:     number  // 1–5
  comment:    string | null
  createdAt:  string
}

interface LocationsState {
  nearby:        PetLocation[]    // resultado do mapa
  searchResults: PetLocation[]
  selected:      PetLocation | null
  reviews:       Record<string, LocationReview[]>  // locationId → reviews
  userLat:       number | null
  userLng:       number | null
  isLoading:     boolean
  isSearching:   boolean
  error:         string | null
}

// ─── Thunks ──────────────────────────────────────────────────
export const fetchNearbyThunk = createAsyncThunk(
  'locations/fetchNearby',
  async (
    payload: { lat: number; lng: number; radiusKm?: number; category?: LocationCategory },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get('/locations/nearby', { params: payload })
      return { locations: data as PetLocation[], lat: payload.lat, lng: payload.lng }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar locais')
    }
  }
)

export const searchLocationsThunk = createAsyncThunk(
  'locations/search',
  async (
    payload: { query: string; category?: LocationCategory; minRating?: number; lat?: number; lng?: number },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.get('/locations/search', { params: payload })
      return data as PetLocation[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro na busca')
    }
  }
)

export const createLocationThunk = createAsyncThunk(
  'locations/create',
  async (
    payload: Omit<PetLocation, 'id' | 'avgRating' | 'reviewsCount' | 'addedBy' | 'createdAt' | 'distanceKm'>,
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post('/locations', payload)
      return data as PetLocation
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao criar local')
    }
  }
)

export const checkInThunk = createAsyncThunk(
  'locations/checkIn',
  async (
    payload: { locationId: string; petId: string; photoUrl?: string; content?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(`/locations/${payload.locationId}/checkin`, payload)
      return data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro no check-in')
    }
  }
)

export const fetchReviewsThunk = createAsyncThunk(
  'locations/fetchReviews',
  async (locationId: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/locations/${locationId}/reviews`)
      return { locationId, reviews: data as LocationReview[] }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar avaliações')
    }
  }
)

export const addReviewThunk = createAsyncThunk(
  'locations/addReview',
  async (
    payload: { locationId: string; rating: number; comment?: string },
    { rejectWithValue }
  ) => {
    try {
      const { data } = await api.post(`/locations/${payload.locationId}/reviews`, payload)
      return { locationId: payload.locationId, review: data as LocationReview }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao avaliar')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const initialState: LocationsState = {
  nearby:        [],
  searchResults: [],
  selected:      null,
  reviews:       {},
  userLat:       null,
  userLng:       null,
  isLoading:     false,
  isSearching:   false,
  error:         null,
}

const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setSelectedLocation: (state, action: PayloadAction<PetLocation | null>) => {
      state.selected = action.payload
    },
    clearSearch: (state) => {
      state.searchResults = []
    },
    clearLocationsError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    // ── nearby ──
    builder
      .addCase(fetchNearbyThunk.pending,   (s) => { s.isLoading = true; s.error = null })
      .addCase(fetchNearbyThunk.fulfilled, (s, a) => {
        s.isLoading = false
        s.nearby    = a.payload.locations
        s.userLat   = a.payload.lat
        s.userLng   = a.payload.lng
      })
      .addCase(fetchNearbyThunk.rejected, (s, a) => { s.isLoading = false; s.error = a.payload as string })

    // ── search ──
    builder
      .addCase(searchLocationsThunk.pending,   (s) => { s.isSearching = true })
      .addCase(searchLocationsThunk.fulfilled, (s, a) => {
        s.isSearching   = false
        s.searchResults = a.payload
      })
      .addCase(searchLocationsThunk.rejected, (s) => { s.isSearching = false })

    // ── create ──
    builder
      .addCase(createLocationThunk.fulfilled, (s, a) => {
        s.nearby.push(a.payload)
      })

    // ── reviews ──
    builder
      .addCase(fetchReviewsThunk.fulfilled, (s, a) => {
        s.reviews[a.payload.locationId] = a.payload.reviews
      })
      .addCase(addReviewThunk.fulfilled, (s, a) => {
        const { locationId, review } = a.payload
        if (!s.reviews[locationId]) s.reviews[locationId] = []
        s.reviews[locationId].unshift(review)
      })
  },
})

export const { setSelectedLocation, clearSearch, clearLocationsError } = locationsSlice.actions
export default locationsSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectNearbyLocations  = (s: any): PetLocation[]   => s.locations.nearby
export const selectSearchResults    = (s: any): PetLocation[]   => s.locations.searchResults
export const selectSelectedLocation = (s: any): PetLocation | null => s.locations.selected
export const selectUserPosition     = (s: any) => ({ lat: s.locations.userLat, lng: s.locations.userLng })
export const selectLocationsLoading = (s: any): boolean         => s.locations.isLoading
export const selectLocationReviews  = (locationId: string) => (s: any): LocationReview[] =>
  s.locations.reviews[locationId] ?? []