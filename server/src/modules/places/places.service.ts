import { AppError } from '../../shared/AppError'
import { placesRepository } from './places.repository'

const VALID_OSM_TYPES = ['node', 'way', 'relation']

export const placesService = {
  async search(query: string, lat?: number, lng?: number, limit = 20) {
    if (!query.trim()) throw new AppError('Termo de busca é obrigatório', 400)
    return placesRepository.search(query, lat, lng, limit)
  },

  async getDetails(osmType: string, osmId: string) {
    if (!VALID_OSM_TYPES.includes(osmType)) {
      throw new AppError('osmType inválido. Use node, way ou relation', 400)
    }
    const id = parseInt(osmId, 10)
    if (isNaN(id)) throw new AppError('osmId inválido', 400)

    const [osmData, reviewStats] = await Promise.all([
      placesRepository.fetchOsmDetails(osmType, id),
      placesRepository.getReviewStats(osmType, id),
    ])

    if (!osmData) return null

    return { ...osmData, ...reviewStats }
  },

  async listReviews(osmType: string, osmId: number) {
    if (!VALID_OSM_TYPES.includes(osmType)) {
      throw new AppError('osmType inválido. Use node, way ou relation', 400)
    }
    if (isNaN(osmId)) throw new AppError('osmId inválido', 400)

    return placesRepository.listReviews(osmType, osmId)
  },

  async addReview(input: {
    osmType: string
    osmId: number
    placeName: string
    placeAddress: string
    placeLat: number
    placeLng: number
    placeCategory?: string
    authorId: string
    authorName: string
    rating: number
    comment?: string
  }) {
    if (!VALID_OSM_TYPES.includes(input.osmType)) {
      throw new AppError('osmType inválido. Use node, way ou relation', 400)
    }
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      throw new AppError('Avaliação deve ser entre 1 e 5', 400)
    }
    if (!input.placeName?.trim()) throw new AppError('placeName é obrigatório', 400)
    if (!input.placeAddress?.trim()) throw new AppError('placeAddress é obrigatório', 400)
    if (!input.authorName?.trim()) throw new AppError('authorName é obrigatório', 400)

    return placesRepository.addReview({
      osmType: input.osmType,
      osmId: input.osmId,
      placeName: input.placeName.trim(),
      placeAddress: input.placeAddress.trim(),
      placeLat: input.placeLat,
      placeLng: input.placeLng,
      placeCategory: input.placeCategory || null,
      authorId: input.authorId,
      authorName: input.authorName.trim(),
      rating: input.rating,
      comment: input.comment?.trim() || null,
    })
  },

  async deleteReview(reviewId: string, userId: string) {
    if (!reviewId) throw new AppError('reviewId é obrigatório', 400)
    await placesRepository.deleteReview(reviewId, userId)
  },
}
