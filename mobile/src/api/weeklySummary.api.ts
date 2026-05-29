import { api } from './axios'

export type WeeklySummary = {
  meals: { total: number; completed: number }
  weight: { current: number | null; previous: number | null; variation: number | null }
  upcoming: { vaccines: number; consultations: number }
}

export async function fetchWeeklySummary(petId: string): Promise<WeeklySummary> {
  const { data } = await api.get(`/pets/${petId}/weekly-summary`)
  return data as WeeklySummary
}
