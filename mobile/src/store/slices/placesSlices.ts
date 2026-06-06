import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '..'
import * as placesApi from '../../api/places.api'

export interface SelectedPlace {
  osmId: number
  osmType: string
  name: string
  displayName: string
  lat: number
  lng: number
  category: string
  type: string
  icon: string | null
  avgRating: number
  reviewsCount: number
  petFriendly?: boolean
  petFriendlyVotes?: number
  userVoted?: boolean
}

interface PetFriendlyIdEntry {
  osmId: number
  osmType: string
  voteCount?: number
}

interface PlacesState {
  searchResults: placesApi.OsmPlaceResult[]
  selectedPlace: SelectedPlace | null
  reviews: placesApi.PlaceReview[]
  isLoadingSearch: boolean
  isLoadingDetails: boolean
  isLoadingReviews: boolean
  error: string | null
  petFriendlyIds: PetFriendlyIdEntry[]
  togglingPetFriendly: boolean
}

const initialState: PlacesState = {
  searchResults: [],
  selectedPlace: null,
  reviews: [],
  isLoadingSearch: false,
  isLoadingDetails: false,
  isLoadingReviews: false,
  error: null,
  petFriendlyIds: [],
  togglingPetFriendly: false,
}

export const searchPlacesThunk = createAsyncThunk(
  'places/search',
  async (params: { q: string; lat?: number; lng?: number; petFriendly?: boolean; category?: string }, { rejectWithValue }) => {
    try {
      return await placesApi.searchPlaces(params.q, params.lat, params.lng, 20, params.petFriendly ?? false, params.category)
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao buscar lugares')
    }
  }
)

export const fetchPlaceDetailsThunk = createAsyncThunk(
  'places/fetchDetails',
  async (params: { osmType: string; osmId: number }, { rejectWithValue }) => {
    try {
      return await placesApi.getPlaceDetails(params.osmType, params.osmId)
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao carregar detalhes')
    }
  }
)

export const fetchPlaceReviewsThunk = createAsyncThunk(
  'places/fetchReviews',
  async (params: { osmType: string; osmId: number }, { rejectWithValue }) => {
    try {
      return await placesApi.getPlaceReviews(params.osmType, params.osmId)
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao carregar avaliações')
    }
  }
)

export const addPlaceReviewThunk = createAsyncThunk(
  'places/addReview',
  async (params: {
    osmType: string
    osmId: number
    rating: number
    comment?: string
    placeName: string
    placeAddress: string
    placeLat: number
    placeLng: number
    placeCategory?: string
  }, { rejectWithValue }) => {
    try {
      return await placesApi.addPlaceReview(params.osmType, params.osmId, params)
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao adicionar avaliação')
    }
  }
)

export const deletePlaceReviewThunk = createAsyncThunk(
  'places/deleteReview',
  async (reviewId: string, { rejectWithValue }) => {
    try {
      await placesApi.deletePlaceReview(reviewId)
      return reviewId
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao remover avaliação')
    }
  }
)

export const togglePetFriendlyThunk = createAsyncThunk(
  'places/togglePetFriendly',
  async (params: { osmType: string; osmId: number }, { rejectWithValue }) => {
    try {
      return await placesApi.togglePetFriendly(params.osmType, params.osmId)
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao alternar Pet Friendly')
    }
  }
)

export const fetchPetFriendlyIdsThunk = createAsyncThunk(
  'places/fetchPetFriendlyIds',
  async (_, { rejectWithValue }) => {
    try {
      return await placesApi.listPetFriendlyIds()
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error || 'Erro ao buscar locais Pet Friendly')
    }
  }
)

const placesSlice = createSlice({
  name: 'places',
  initialState,
  reducers: {
    clearSearchResults(state) {
      state.searchResults = []
    },
    clearSelectedPlace(state) {
      state.selectedPlace = null
      state.reviews = []
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchPlacesThunk.pending, (state) => {
        state.isLoadingSearch = true
        state.error = null
      })
      .addCase(searchPlacesThunk.fulfilled, (state, action) => {
        state.searchResults = action.payload
        state.isLoadingSearch = false
      })
      .addCase(searchPlacesThunk.rejected, (state, action) => {
        state.isLoadingSearch = false
        state.error = action.payload as string
      })
      .addCase(fetchPlaceDetailsThunk.fulfilled, (state, action) => {
        const d = action.payload
        state.selectedPlace = {
          osmId: d.osmId,
          osmType: d.osmType,
          name: d.name,
          displayName: d.displayName,
          lat: d.lat,
          lng: d.lng,
          category: d.category,
          type: d.type,
          icon: null,
          avgRating: d.avgRating,
          reviewsCount: d.reviewsCount,
          petFriendly: d.petFriendly,
          petFriendlyVotes: d.petFriendlyVotes,
          userVoted: d.userVoted,
        }
        state.isLoadingDetails = false
      })
      .addCase(fetchPlaceDetailsThunk.pending, (state) => {
        state.isLoadingDetails = true
      })
      .addCase(fetchPlaceDetailsThunk.rejected, (state) => {
        state.isLoadingDetails = false
      })
      .addCase(fetchPlaceReviewsThunk.fulfilled, (state, action) => {
        state.reviews = action.payload
        state.isLoadingReviews = false
      })
      .addCase(fetchPlaceReviewsThunk.pending, (state) => {
        state.isLoadingReviews = true
      })
      .addCase(fetchPlaceReviewsThunk.rejected, (state) => {
        state.isLoadingReviews = false
      })
      .addCase(addPlaceReviewThunk.fulfilled, (state, action) => {
        state.reviews.unshift(action.payload)
      })
      .addCase(deletePlaceReviewThunk.fulfilled, (state, action) => {
        state.reviews = state.reviews.filter((r) => r.id !== action.payload)
      })
      .addCase(togglePetFriendlyThunk.pending, (state) => {
        state.togglingPetFriendly = true
      })
      .addCase(togglePetFriendlyThunk.fulfilled, (state, action) => {
        state.togglingPetFriendly = false
        const { voted, voteCount, petFriendly } = action.payload
        if (state.selectedPlace) {
          state.selectedPlace.userVoted = voted
          state.selectedPlace.petFriendlyVotes = voteCount
          state.selectedPlace.petFriendly = petFriendly
        }
        const sel = state.selectedPlace
        if (sel) {
          state.petFriendlyIds = state.petFriendlyIds.filter(
            p => !(p.osmId === sel.osmId && p.osmType === sel.osmType)
          )
          if (voted) {
            state.petFriendlyIds.push({ osmId: sel.osmId, osmType: sel.osmType, voteCount })
          }
        }
      })
      .addCase(togglePetFriendlyThunk.rejected, (state) => {
        state.togglingPetFriendly = false
      })
      .addCase(fetchPetFriendlyIdsThunk.fulfilled, (state, action) => {
        state.petFriendlyIds = action.payload
      })
  },
})

export const { clearSearchResults, clearSelectedPlace, clearError } = placesSlice.actions

export const selectPlaceSearchResults = (state: RootState) => state.places.searchResults
export const selectSelectedPlace = (state: RootState) => state.places.selectedPlace
export const selectPlaceReviews = (state: RootState) => state.places.reviews
export const selectPlacesLoadingSearch = (state: RootState) => state.places.isLoadingSearch
export const selectPlacesLoadingDetails = (state: RootState) => state.places.isLoadingDetails
export const selectPlacesLoadingReviews = (state: RootState) => state.places.isLoadingReviews
export const selectPlacesError = (state: RootState) => state.places.error
export const selectPetFriendlyIds = (state: RootState) => state.places.petFriendlyIds
export const selectTogglingPetFriendly = (state: RootState) => state.places.togglingPetFriendly

export default placesSlice.reducer
