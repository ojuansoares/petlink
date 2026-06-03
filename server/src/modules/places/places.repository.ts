import { PlaceReview } from '../../models/PlaceReview'
import { AppError } from '../../shared/AppError'
import { mapId } from '../../shared/mapId'

interface NominatimResult {
  place_id: number
  osm_id: number
  osm_type: string
  lat: string
  lon: string
  display_name: string
  type: string
  category: string
  importance: number
  icon?: string
  boundingbox?: string[]
  address?: Record<string, string>
}

interface OsmDetailsResult {
  place_id: number
  osm_id: number
  osm_type: string
  lat: string
  lon: string
  display_name: string
  category: string
  type: string
  address?: Record<string, string>
  extratags?: Record<string, string>
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'PetLinkApp/1.0 (mobile app)'
const SEARCH_CACHE = new Map<string, { data: any; ts: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 min

function getCached(key: string) {
  const entry = SEARCH_CACHE.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data
  SEARCH_CACHE.delete(key)
  return null
}

function setCache(key: string, data: any) {
  SEARCH_CACHE.set(key, { data, ts: Date.now() })
  if (SEARCH_CACHE.size > 200) {
    const oldest = SEARCH_CACHE.keys().next().value
    if (oldest) SEARCH_CACHE.delete(oldest)
  }
}

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

let lastNominatimRequest = 0
const MIN_INTERVAL_MS = 1100

async function nominatimFetch(url: string): Promise<any> {
  const now = Date.now()
  const elapsed = now - lastNominatimRequest
  if (elapsed < MIN_INTERVAL_MS) {
    await delay(MIN_INTERVAL_MS - elapsed)
  }
  lastNominatimRequest = Date.now()

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: 'https://petlink.app',
    },
  })
  if (!res.ok) {
    throw new AppError(`Erro ao consultar Nominatim: ${res.status}`, 502)
  }
  return res.json()
}

function mapNominatimResult(r: NominatimResult) {
  return {
    osmId: r.osm_id,
    osmType: r.osm_type,
    name: r.display_name.split(',')[0] || r.display_name,
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    category: r.category,
    type: r.type,
    icon: r.icon || null,
    importance: r.importance,
    boundingbox: r.boundingbox || null,
  }
}

export const placesRepository = {
  async search(query: string, lat?: number, lng?: number, limit = 20) {
    const cacheKey = `search:${query}:${lat ?? ''}:${lng ?? ''}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    let url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}`
    if (lat !== undefined && lng !== undefined) {
      url += `&lat=${lat}&lon=${lng}`
    }

    const data: NominatimResult[] = await nominatimFetch(url)
    const results = data
      .filter(r => r.osm_id && r.osm_type)
      .map(mapNominatimResult)

    setCache(cacheKey, results)
    return results
  },

  async fetchOsmDetails(osmType: string, osmId: number): Promise<any | null> {
    const cacheKey = `details:${osmType}:${osmId}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const typeMap: Record<string, string> = { node: 'N', way: 'W', relation: 'R' }
    const osmTypeShort = typeMap[osmType]
    if (!osmTypeShort) return null

    const url = `${NOMINATIM_BASE}/details?osmtype=${osmTypeShort}&osmid=${osmId}&format=json&addressdetails=1&hierarchy=0&group_hierarchy=1`

    try {
      const data: OsmDetailsResult = await nominatimFetch(url)
      if (!data || !data.osm_id) return null

      const result = {
        osmId: data.osm_id,
        osmType: data.osm_type,
        name: data.display_name?.split(',')[0] || data.display_name,
        displayName: data.display_name,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        category: data.category,
        type: data.type,
        address: data.address || null,
        extratags: data.extratags || null,
      }

      setCache(cacheKey, result)
      return result
    } catch {
      return null
    }
  },

  async getReviewStats(osmType: string, osmId: number) {
    const stats = await PlaceReview.aggregate([
      { $match: { osmType, osmId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, reviewsCount: { $sum: 1 } } },
    ])

    if (stats.length === 0) {
      return { avgRating: 0, reviewsCount: 0 }
    }

    return {
      avgRating: Math.round(stats[0].avgRating * 10) / 10,
      reviewsCount: stats[0].reviewsCount,
    }
  },

  async listReviews(osmType: string, osmId: number) {
    const data = await PlaceReview.find({ osmType, osmId })
      .sort({ createdAt: -1 })
      .lean()

    return data.map(mapId)
  },

  async addReview(input: {
    osmType: string
    osmId: number
    placeName: string
    placeAddress: string
    placeLat: number
    placeLng: number
    placeCategory: string | null
    authorId: string
    authorName: string
    rating: number
    comment: string | null
  }) {
    const existing = await PlaceReview.findOne({
      osmId: input.osmId,
      osmType: input.osmType,
      authorId: input.authorId,
    })

    if (existing) {
      throw new AppError('Você já avaliou este lugar', 409)
    }

    const review = await PlaceReview.create(input)
    return review.toJSON()
  },

  async deleteReview(reviewId: string, userId: string) {
    const review = await PlaceReview.findById(reviewId)
    if (!review) throw new AppError('Avaliação não encontrada', 404)
    if (review.authorId !== userId) throw new AppError('Sem permissão', 403)

    await PlaceReview.findByIdAndDelete(reviewId)
  },
}
