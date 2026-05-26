import { AppError } from '../../shared/AppError'
import { locationsRepository } from './locations.repository'

export const locationsService = {
  async findNearby(lat: number, lng: number, radiusKm?: number, category?: string) {
    return locationsRepository.findNearby(lat, lng, radiusKm, category)
  },

  async search(query: string, category?: string, minRating?: number, lat?: number, lng?: number) {
    if (!query?.trim()) {
      throw new AppError('Termo de busca é obrigatório', 400)
    }
    return locationsRepository.search(query.trim(), category, minRating, lat, lng)
  },

  async create(payload: {
    name: string
    category: string
    description?: string
    address: string
    lat: number
    lng: number
    photoUrl?: string
    addedBy: string
  }) {
    if (!payload.name?.trim()) throw new AppError('Nome é obrigatório', 400)
    if (!payload.address?.trim()) throw new AppError('Endereço é obrigatório', 400)
    if (!payload.lat || !payload.lng) throw new AppError('Coordenadas são obrigatórias', 400)

    return locationsRepository.create({
      name: payload.name.trim(),
      category: payload.category,
      description: payload.description || null,
      address: payload.address.trim(),
      lat: payload.lat,
      lng: payload.lng,
      photo_url: payload.photoUrl || null,
      added_by: payload.addedBy,
    })
  },

  async checkIn(locationId: string, userId: string, petId: string, photoUrl?: string, content?: string) {
    if (!locationId || !petId) throw new AppError('locationId e petId são obrigatórios', 400)
    return locationsRepository.checkIn(locationId, userId, petId, photoUrl, content)
  },

  async listReviews(locationId: string) {
    if (!locationId) throw new AppError('locationId é obrigatório', 400)
    return locationsRepository.listReviews(locationId)
  },

  async addReview(locationId: string, authorId: string, authorName: string, rating: number, comment?: string) {
    if (!locationId) throw new AppError('locationId é obrigatório', 400)
    if (!rating || rating < 1 || rating > 5) throw new AppError('Avaliação deve ser entre 1 e 5', 400)
    if (!authorName?.trim()) throw new AppError('Nome do autor é obrigatório', 400)

    return locationsRepository.addReview(locationId, authorId, authorName.trim(), rating, comment?.trim() || undefined)
  },
}
