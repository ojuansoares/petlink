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

function mapWalk(raw: any): Walk {
  return {
    id: raw.id,
    petId: raw.pet_id ?? raw.petId,
    ownerId: raw.owner_id ?? raw.ownerId,
    startedAt: raw.started_at ?? raw.startedAt,
    endedAt: raw.ended_at ?? raw.endedAt ?? null,
    distanceM: raw.distance_m ?? raw.distanceM ?? 0,
    durationS: raw.duration_s ?? raw.durationS ?? 0,
    stepsCount: raw.steps_count ?? raw.stepsCount ?? null,
    avgSpeedKmh: raw.avg_speed_kmh ?? raw.avgSpeedKmh ?? null,
    avgPaceMinKm: raw.avg_pace_min_km ?? raw.avgPaceMinKm ?? null,
    maxSpeedKmh: raw.max_speed_kmh ?? raw.maxSpeedKmh ?? null,
    calories: raw.calories ?? null,
    photoUrl: raw.photo_url ?? raw.photoUrl ?? null,
    route: raw.route ?? [],
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
  }
}

export async function fetchWalks(petId: string): Promise<Walk[]> {
  const { data } = await api.get(`/walks?petId=${petId}`)
  return (data ?? []).map(mapWalk)
}

export async function fetchWalkById(id: string): Promise<Walk> {
  const { data } = await api.get(`/walks/${id}`)
  return mapWalk(data)
}

export async function createWalk(payload: Omit<Walk, 'id' | 'createdAt'>): Promise<Walk> {
  const { data } = await api.post('/walks', payload)
  return mapWalk(data)
}

export async function updateWalk(id: string, payload: { photoUrl?: string; notes?: string }): Promise<Walk> {
  const { data } = await api.put(`/walks/${id}`, payload)
  return mapWalk(data)
}

export async function deleteWalk(id: string): Promise<void> {
  await api.delete(`/walks/${id}`)
}

export async function fetchWalkStats(petId: string, start: string, end: string): Promise<WalkStats[]> {
  const { data } = await api.get(`/walks/stats?petId=${petId}&start=${start}&end=${end}`)
  return data
}
