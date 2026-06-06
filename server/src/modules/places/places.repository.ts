import { PlaceReview } from '../../models/PlaceReview'
import { PetFriendlyPlace } from '../../models/PetFriendlyPlace'
import { AppError } from '../../shared/AppError'
import { mapId } from '../../shared/mapId'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
  lat?: string
  lon?: string
  display_name?: string
  localname?: string
  names?: { name?: string; [key: string]: any }
  category: string
  type: string
  address?: Array<{ localname?: string; [key: string]: any }> | Record<string, string>
  extratags?: Record<string, string>
  centroid?: { type: string; coordinates: number[] }
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

function safeParseFloat(v: any): number {
  const n = parseFloat(v)
  return isFinite(n) ? n : 0
}

const OSM_TYPE_TO_CATEGORY: Record<string, string> = {
  veterinary: 'vet',
  vet: 'vet',
  pet_shop: 'petshop',
  pet: 'petshop',
  park: 'park',
  hotel: 'hotel',
  beach: 'beach',
  dog_park: 'park',
  animal_hospital: 'vet',
  clinic: 'vet',
  animal_boarding: 'hotel',
  kennel: 'hotel',
  pet_grooming: 'petshop',
  pet_supply: 'petshop',
}

function normalizeCategory(type: string): string {
  return OSM_TYPE_TO_CATEGORY[type] || 'other'
}

const CATEGORY_SEARCH_AUGMENTS: Record<string, string> = {
  vet: 'veterinaria animal clinica',
  petshop: 'pet shop animais',
  park: 'parque verde',
  hotel: 'hotel pet animais',
  beach: 'praia orla',
}

const OSM_TYPE_LABELS: Record<string, string> = {
  veterinary: 'Clínica Veterinária',
  vet: 'Veterinário',
  pet_shop: 'Pet Shop',
  pet: 'Pet Shop',
  park: 'Parque',
  hotel: 'Hotel',
  beach: 'Praia',
  dog_park: 'Parque para Cães',
  animal_hospital: 'Hospital Veterinário',
  clinic: 'Clínica',
  animal_boarding: 'Hotel para Pets',
  kennel: 'Canil',
  pet_grooming: 'Tosa e Banho',
  pet_supply: 'Loja de Pets',
  restaurant: 'Restaurante',
  cafe: 'Café',
  fast_food: 'Fast Food',
  supermarket: 'Supermercado',
  mall: 'Shopping',
  pharmacy: 'Farmácia',
  hospital: 'Hospital',
  dentist: 'Dentista',
  school: 'Escola',
  university: 'Universidade',
  library: 'Biblioteca',
  place_of_worship: 'Igreja/Templo',
  police: 'Delegacia',
  fire_station: 'Corpo de Bombeiros',
  post_office: 'Correios',
  bank: 'Banco',
  atm: 'Caixa Eletrônico',
  fuel: 'Posto de Gasolina',
  parking: 'Estacionamento',
  bus_station: 'Rodoviária',
  train_station: 'Estação de Trem',
  airport: 'Aeroporto',
  ferry_terminal: 'Terminal de Balsa',
  theatre: 'Teatro',
  cinema: 'Cinema',
  museum: 'Museu',
  zoo: 'Zoológico',
  stadium: 'Estádio',
  sports_centre: 'Centro Esportivo',
  gym: 'Academia',
  swimming_pool: 'Piscina',
  campground: 'Acampamento',
  picnic_site: 'Área de Piquenique',
  playground: 'Parquinho',
  garden: 'Jardim',
  nature_reserve: 'Reserva Natural',
  forest: 'Floresta',
  water_park: 'Parque Aquático',
  marketplace: 'Feira/ Mercado',
  convenience: 'Mercado',
  bakery: 'Padaria',
  butcher: 'Açougue',
  florist: 'Floricultura',
  gift_shop: 'Loja de Presentes',
  chemist: 'Farmácia',
  hairdresser: 'Salão de Beleza',
  department_store: 'Loja de Departamento',
  clothes: 'Loja de Roupas',
  shoes: 'Sapataria',
  electronics: 'Loja de Eletrônicos',
  furniture: 'Loja de Móveis',
  hardware: 'Loja de Materiais de Construção',
  garden_centre: 'Centro de Jardinagem',
  car_dealer: 'Concessionária',
  car_repair: 'Oficina Mecânica',
  car_wash: 'Lava Rápido',
  bicycle_rental: 'Aluguel de Bicicletas',
  bicycle_parking: 'Estacionamento de Bicicletas',
  taxi: 'Ponto de Táxi',
}

function getTypeLabel(type: string): string {
  return OSM_TYPE_LABELS[type] || type.replace(/_/g, ' ')
}

function mapNominatimResult(r: NominatimResult) {
  return {
    osmId: r.osm_id,
    osmType: r.osm_type,
    name: r.display_name.split(',')[0] || r.display_name,
    displayName: r.display_name,
    lat: safeParseFloat(r.lat),
    lng: safeParseFloat(r.lon),
    category: r.category,
    type: r.type,
    typeLabel: getTypeLabel(r.type),
    normalizedCategory: normalizeCategory(r.type),
    icon: r.icon || null,
    importance: r.importance,
    boundingbox: r.boundingbox || null,
  }
}

export const placesRepository = {
  async search(query: string, lat?: number, lng?: number, limit = 20, petFriendly = false, category?: string) {
    const cacheKey = `search:${query}:${lat ?? ''}:${lng ?? ''}:${limit}:pf${petFriendly}:cat${category ?? ''}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    // Augment query with category-specific terms so Nominatim finds places by OSM type, not just by name
    let effectiveQuery = query
    if (category && CATEGORY_SEARCH_AUGMENTS[category] && query.length < 15) {
      effectiveQuery = `${query} ${CATEGORY_SEARCH_AUGMENTS[category]}`
    }

    let url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(effectiveQuery)}&format=json&addressdetails=1&limit=${limit}&countrycodes=br`
    if (lat !== undefined && lng !== undefined) {
      url += `&lat=${lat}&lon=${lng}`
    }

    const data: NominatimResult[] = await nominatimFetch(url)
    let results = data
      .filter(r => r.osm_id && r.osm_type)
      .map(mapNominatimResult)

    // Enrich with pet-friendly vote info from our DB
    const pfVoteMap = new Map<string, number>()
    if (results.length > 0) {
      const pfAgg = await PetFriendlyPlace.aggregate([
        { $match: { $or: results.map(r => ({ osmType: r.osmType, osmId: r.osmId })) } },
        { $group: { _id: { osmId: '$osmId', osmType: '$osmType' }, voteCount: { $sum: 1 } } },
      ])
      for (const entry of pfAgg) {
        pfVoteMap.set(`${entry._id.osmType}-${entry._id.osmId}`, entry.voteCount)
      }
    }

    // Filter by pet-friendly if enabled (has at least 1 vote)
    if (petFriendly) {
      results = results.filter(r => (pfVoteMap.get(`${r.osmType}-${r.osmId}`) ?? 0) > 0)
    }

    // Filter by normalized category
    if (category) {
      results = results.filter(r => (r as any).normalizedCategory === category)
    }

    // Sort by distance from user when coords are available
    if (lat !== undefined && lng !== undefined) {
      try {
        results.sort((a, b) => {
          const distA = haversineDistance(lat, lng, a.lat, a.lng)
          const distB = haversineDistance(lat, lng, b.lat, b.lng)
          return distA - distB
        })
      } catch {
        // fallback to default ordering on sort error
      }
    }

    for (const r of results) {
      (r as any).petFriendly = (pfVoteMap.get(`${r.osmType}-${r.osmId}`) ?? 0) > 0
      const v = pfVoteMap.get(`${r.osmType}-${r.osmId}`) ?? 0; (r as any).petFriendlyVotes = v
    }

    setCache(cacheKey, results)
    return results
  },

  async fetchOsmDetails(osmType: string, osmId: number): Promise<any | null> {
    const cacheKey = `details:${osmType}:${osmId}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const typeMap: Record<string, string> = { node: 'N', way: 'W', relation: 'R' }
    const reverseTypeMap: Record<string, string> = { N: 'node', W: 'way', R: 'relation' }
    const osmTypeShort = typeMap[osmType]
    if (!osmTypeShort) return null

    const url = `${NOMINATIM_BASE}/details?osmtype=${osmTypeShort}&osmid=${osmId}&format=json&addressdetails=1&hierarchy=0&group_hierarchy=1`

    try {
      const data: OsmDetailsResult = await nominatimFetch(url)
      if (!data || !data.osm_id) return null

      let lat = safeParseFloat(data.lat)
      let lon = safeParseFloat(data.lon)
      if ((lat === 0 || lon === 0) && data.centroid?.coordinates?.length === 2) {
        lon = safeParseFloat(data.centroid.coordinates[0])
        lat = safeParseFloat(data.centroid.coordinates[1])
      }

      const addressLocalname = Array.isArray(data.address) ? data.address[0]?.localname : undefined
      const name = data.localname || data.names?.name || data.display_name?.split(',')[0] || data.display_name || addressLocalname || `${data.type} ${data.osm_id}`
      const addressParts: string[] = []
      if (Array.isArray(data.address)) {
        for (const entry of data.address) {
          if (entry.localname && !addressParts.includes(entry.localname)) {
            addressParts.push(entry.localname)
          }
        }
      }
      const displayName = data.display_name || addressParts.join(', ') || name

      const result = {
        osmId: data.osm_id,
        osmType: reverseTypeMap[data.osm_type] ?? data.osm_type,
        name,
        displayName,
        lat,
        lng: lon,
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

  async getPetFriendlyInfo(osmType: string, osmId: number): Promise<{ petFriendly: boolean; voteCount: number }> {
    const count = await PetFriendlyPlace.countDocuments({ osmType, osmId })
    return { petFriendly: count > 0, voteCount: count }
  },

  async getUserVote(osmType: string, osmId: number, userId: string): Promise<boolean> {
    const entry = await PetFriendlyPlace.findOne({ osmType, osmId, addedBy: userId }).select('_id').lean()
    return !!entry
  },

  async deleteReview(reviewId: string, userId: string) {
    const review = await PlaceReview.findById(reviewId)
    if (!review) throw new AppError('Avaliação não encontrada', 404)
    if (review.authorId !== userId) throw new AppError('Sem permissão', 403)

    await PlaceReview.findByIdAndDelete(reviewId)
  },

  async togglePetFriendly(input: { osmType: string; osmId: number; userId: string }) {
    const existing = await PetFriendlyPlace.findOne({ osmType: input.osmType, osmId: input.osmId, addedBy: input.userId })

    if (existing) {
      await PetFriendlyPlace.findByIdAndDelete(existing._id)
    } else {
      const details = await this.fetchOsmDetails(input.osmType, input.osmId)
      await PetFriendlyPlace.create({
        osmType: input.osmType,
        osmId: input.osmId,
        name: details?.name || `${input.osmType} ${input.osmId}`,
        address: details?.displayName || '',
        lat: details?.lat || 0,
        lng: details?.lng || 0,
        category: details?.category || 'other',
        addedBy: input.userId,
      })
    }

    const voteCount = await PetFriendlyPlace.countDocuments({ osmType: input.osmType, osmId: input.osmId })
    return { voted: !existing, voteCount }
  },

  async listPetFriendlyIds() {
    const entries = await PetFriendlyPlace.aggregate([
      { $group: { _id: { osmId: '$osmId', osmType: '$osmType' }, voteCount: { $sum: 1 } } },
      { $project: { _id: 0, osmId: '$_id.osmId', osmType: '$_id.osmType', voteCount: 1 } },
    ])
    return entries
  },
}
