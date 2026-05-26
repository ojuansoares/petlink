import { Location } from '../../models/Location'
import { Review } from '../../models/Review'
import { Checkin } from '../../models/Checkin'
import { mapId } from '../../shared/mapId'

export const locationsRepository = {
  async findNearby(lat: number, lng: number, radiusKm = 10, category?: string) {
    const radiusMeters = radiusKm * 1000

    const filter: Record<string, any> = {
      geometry: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    }

    if (category) filter.category = category

    const data = await Location.find(filter)
      .sort({ avgRating: -1 })
      .lean()

    return data.map((loc: any) => ({
      ...mapId(loc),
      distanceKm: Math.round(haversine(lat, lng, loc.geometry.coordinates[1], loc.geometry.coordinates[0]) * 10) / 10,
    }))
  },

  async search(queryStr: string, category?: string, minRating?: number, lat?: number, lng?: number) {
    const filter: Record<string, any> = {
      name: { $regex: queryStr, $options: 'i' },
    }

    if (category) filter.category = category
    if (minRating) filter.avgRating = { $gte: minRating }

    let data = await Location.find(filter)
      .sort({ avgRating: -1 })
      .lean()

    data = data.map((loc: any) => {
      const mapped: any = mapId(loc)
      if (lat !== undefined && lng !== undefined) {
        mapped.distanceKm = Math.round(haversine(lat, lng, loc.geometry.coordinates[1], loc.geometry.coordinates[0]) * 10) / 10
      }
      return mapped
    })

    return data
  },

  async create(input: {
    name: string
    category: string
    description?: string | null
    address: string
    lat: number
    lng: number
    photo_url?: string | null
    added_by: string
  }) {
    const location = await Location.create({
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      address: input.address,
      geometry: { type: 'Point', coordinates: [input.lng, input.lat] },
      photoUrl: input.photo_url ?? null,
      addedBy: input.added_by,
    })

    return location.toJSON()
  },

  async checkIn(locationId: string, userId: string, petId: string, photoUrl?: string, content?: string) {
    const checkin = await Checkin.create({
      locationId,
      userId,
      petId,
      photoUrl: photoUrl ?? null,
      content: content ?? null,
    })

    return checkin.toJSON()
  },

  async listReviews(locationId: string) {
    const data = await Review.find({ locationId })
      .sort({ createdAt: -1 })
      .lean()

    return data.map(mapId)
  },

  async addReview(locationId: string, authorId: string, authorName: string, rating: number, comment?: string) {
    const review = await Review.create({
      locationId,
      authorId,
      authorName,
      rating,
      comment: comment ?? null,
    })

    const stats = await Review.aggregate([
      { $match: { locationId: review.locationId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])

    if (stats.length > 0) {
      await Location.findByIdAndUpdate(locationId, {
        avgRating: Math.round(stats[0].avg * 10) / 10,
        reviewsCount: stats[0].count,
      })
    }

    return review.toJSON()
  },
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
