import { api } from './axios'

export interface WalkPoint {
  lat: number
  lng: number
  timestamp: string
}

export interface Walk {
  id: string
  petId: string
  ownerId: string
  startedAt: string
  endedAt: string | null
  distanceM: number
  durationS: number
  stepsCount: number | null
  avgSpeedKmh: number | null
  avgPaceMinKm: number | null
  maxSpeedKmh: number | null
  calories: number | null
  photoUrl: string | null
  route: WalkPoint[]
  notes: string | null
  createdAt: string
}

export interface WalkStats {
  started_at: string
  distance_m: number
  duration_s: number
  calories: number | null
}

export async function fetchWalks(petId: string): Promise<Walk[]> {
  const { data } = await api.get(`/walks?petId=${petId}`)
  return data
}

export async function fetchWalkById(id: string): Promise<Walk> {
  const { data } = await api.get(`/walks/${id}`)
  return data
}

export async function createWalk(payload: Omit<Walk, 'id' | 'createdAt'>): Promise<Walk> {
  const { data } = await api.post('/walks', payload)
  return data
}

export async function updateWalk(id: string, payload: { photoUrl?: string; notes?: string }): Promise<Walk> {
  const { data } = await api.put(`/walks/${id}`, payload)
  return data
}

export async function deleteWalk(id: string): Promise<void> {
  await api.delete(`/walks/${id}`)
}

export async function fetchWalkStats(petId: string, start: string, end: string): Promise<WalkStats[]> {
  const { data } = await api.get(`/walks/stats?petId=${petId}&start=${start}&end=${end}`)
  return data
}
