import { supabaseAdmin } from '../../config/supabase'

export type Walk = {
  id:          string
  pet_id:      string
  owner_id:    string
  started_at:  string
  ended_at:    string | null
  distance_m:  number
  duration_s:  number
  steps_count: number | null
  avg_speed_kmh: number | null
  route:       unknown
  notes:       string | null
  created_at:  string
}

export const walksRepository = {
  async listByPet(petId: string): Promise<Walk[]> {
    const { data, error } = await supabaseAdmin
      .from('walks')
      .select('*')
      .eq('pet_id', petId)
      .order('started_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Walk[]
  },

  async create(input: {
    pet_id: string
    owner_id: string
    started_at: string
    ended_at?: string | null
    distance_m: number
    duration_s: number
    steps_count?: number | null
    avg_speed_kmh?: number | null
    route: unknown
    notes?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('walks')
      .insert({
        pet_id: input.pet_id,
        owner_id: input.owner_id,
        started_at: input.started_at,
        ended_at: input.ended_at ?? null,
        distance_m: input.distance_m,
        duration_s: input.duration_s,
        steps_count: input.steps_count ?? null,
        avg_speed_kmh: input.avg_speed_kmh ?? null,
        route: input.route,
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
