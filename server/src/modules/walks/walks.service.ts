import { AppError } from '../../shared/AppError'
import { walksRepository } from './walks.repository'

export const walksService = {
  async listByPet(petId: string, ownerId: string) {
    if (!petId) throw new AppError('petId é obrigatório', 400)
    return walksRepository.listByPet(petId)
  },

  async create(payload: {
    petId: string
    ownerId: string
    startedAt: string
    endedAt?: string
    distanceM: number
    durationS: number
    stepsCount?: number
    avgSpeedKmh?: number
    route: unknown
    notes?: string
  }) {
    return walksRepository.create({
      pet_id: payload.petId,
      owner_id: payload.ownerId,
      started_at: payload.startedAt,
      ended_at: payload.endedAt ?? null,
      distance_m: payload.distanceM,
      duration_s: payload.durationS,
      steps_count: payload.stepsCount ?? null,
      avg_speed_kmh: payload.avgSpeedKmh ?? null,
      route: payload.route,
      notes: payload.notes ?? null,
    })
  },
}
