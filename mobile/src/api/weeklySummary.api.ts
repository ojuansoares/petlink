import { api } from './axios'
import { homeCacheRepository } from '../data/repositories/HomeCacheRepository'

export type WeeklySummary = {
  meals: { total: number; completed: number }
  weight: { current: number | null; previous: number | null; variation: number | null }
  upcoming: { vaccines: number; consultations: number }
}

export async function fetchWeeklySummary(petId: string): Promise<WeeklySummary | null> {
  try {
    const { data } = await api.get(`/pets/${petId}/weekly-summary`)
    await homeCacheRepository.saveWeeklySummary(petId, data)
    return data as WeeklySummary
  } catch {
    const cached = await homeCacheRepository.getWeeklySummary<WeeklySummary>(petId)
    return cached
  }
}
