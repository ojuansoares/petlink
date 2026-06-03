import { api } from './axios'

export interface OsmPlaceResult {
  osmId: number
  osmType: string
  name: string
  displayName: string
  lat: number
  lng: number
  category: string
  type: string
  icon: string | null
  importance: number
  boundingbox: string[] | null
}

export interface OsmPlaceDetails {
  osmId: number
  osmType: string
  name: string
  displayName: string
  lat: number
  lng: number
  category: string
  type: string
  address: Record<string, string> | null
  extratags: Record<string, string> | null
  avgRating: number
  reviewsCount: number
}

export interface PlaceReview {
  id: string
  osmId: number
  osmType: string
  placeName: string
  placeAddress: string
  authorId: string
  authorName: string
  rating: number
  comment: string | null
  createdAt: string
}

export async function searchPlaces(
  q: string,
  lat?: number,
  lng?: number,
  limit = 20
): Promise<OsmPlaceResult[]> {
  const params: Record<string, string> = { q, limit: String(limit) }
  if (lat !== undefined) params.lat = String(lat)
  if (lng !== undefined) params.lng = String(lng)

  const { data } = await api.get('/places/search', { params })
  return data
}

export async function getPlaceDetails(
  osmType: string,
  osmId: number
): Promise<OsmPlaceDetails> {
  const { data } = await api.get(`/places/${osmType}/${osmId}`)
  return data
}

export async function getPlaceReviews(
  osmType: string,
  osmId: number
): Promise<PlaceReview[]> {
  const { data } = await api.get(`/places/${osmType}/${osmId}/reviews`)
  return data
}

export async function addPlaceReview(
  osmType: string,
  osmId: number,
  review: {
    rating: number
    comment?: string
    placeName: string
    placeAddress: string
    placeLat: number
    placeLng: number
    placeCategory?: string
  }
): Promise<PlaceReview> {
  const { data } = await api.post(`/places/${osmType}/${osmId}/reviews`, review)
  return data
}

export async function deletePlaceReview(reviewId: string): Promise<void> {
  await api.delete(`/places/reviews/${reviewId}`)
}
