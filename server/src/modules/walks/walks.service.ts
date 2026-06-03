import { AppError } from '../../shared/AppError'
import { walksRepository } from './walks.repository'

function estimateCalories(durationS: number, distanceM: number, avgSpeedKmh: number): number {
  const weight = 70 // peso médio estimado (kg) — ideal seria vir do pet
  const met = avgSpeedKmh > 6 ? 5 : avgSpeedKmh > 4 ? 3.5 : 2.5
  const hours = durationS / 3600
  return Math.round(met * weight * hours)
}

export const walksService = {
  async listByPet(petId: string, ownerId: string) {
    if (!petId) throw new AppError('petId é obrigatório', 400)
    return walksRepository.listByPet(petId)
  },

  async findById(id: string) {
    if (!id) throw new AppError('id é obrigatório', 400)
    const walk = await walksRepository.findById(id)
    if (!walk) throw new AppError('Passeio não encontrado', 404)
    return walk
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
    avgPaceMinKm?: number
    maxSpeedKmh?: number
    calories?: number
    photoUrl?: string
    route: unknown
    notes?: string
  }) {
    const avgSpeed = payload.avgSpeedKmh ?? 0
    const calories = payload.calories ?? estimateCalories(payload.durationS, payload.distanceM, avgSpeed)
    const avgPace = payload.avgPaceMinKm ?? (avgSpeed > 0 ? 60 / avgSpeed : null)

    return walksRepository.create({
      pet_id: payload.petId,
      owner_id: payload.ownerId,
      started_at: payload.startedAt,
      ended_at: payload.endedAt ?? null,
      distance_m: payload.distanceM,
      duration_s: payload.durationS,
      steps_count: payload.stepsCount ?? null,
      avg_speed_kmh: avgSpeed,
      avg_pace_min_km: avgPace,
      max_speed_kmh: payload.maxSpeedKmh ?? null,
      calories,
      photo_url: payload.photoUrl ?? null,
      route: payload.route,
      notes: payload.notes ?? null,
    })
  },

  async update(id: string, payload: {
    photoUrl?: string
    notes?: string
  }) {
    if (!id) throw new AppError('id é obrigatório', 400)
    const walk = await walksRepository.findById(id)
    if (!walk) throw new AppError('Passeio não encontrado', 404)

    return walksRepository.update(id, {
      photo_url: payload.photoUrl,
      notes: payload.notes,
    })
  },

  async remove(id: string) {
    if (!id) throw new AppError('id é obrigatório', 400)
    const walk = await walksRepository.findById(id)
    if (!walk) throw new AppError('Passeio não encontrado', 404)
    await walksRepository.remove(id)
  },

  async getStats(petId: string, start: string, end: string) {
    if (!petId) throw new AppError('petId é obrigatório', 400)
    return walksRepository.getStats(petId, start, end)
  },
}
