import { supabaseAdmin } from '../../config/supabase'

export type Walk = {
  id: string
  pet_id: string
  owner_id: string
  started_at: string
  ended_at: string | null
  distance_m: number
  duration_s: number
  steps_count: number | null
  avg_speed_kmh: number | null
  avg_pace_min_km: number | null
  max_speed_kmh: number | null
  calories: number | null
  photo_url: string | null
  route: unknown
  notes: string | null
  title: string | null
  color: string | null
  location: string | null
  created_at: string
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

  async findById(id: string): Promise<Walk | null> {
    const { data, error } = await supabaseAdmin
      .from('walks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data as Walk
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
    avg_pace_min_km?: number | null
    max_speed_kmh?: number | null
    calories?: number | null
    photo_url?: string | null
    route: unknown
    notes?: string | null
    title?: string | null
    color?: string | null
    location?: string | null
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
        avg_pace_min_km: input.avg_pace_min_km ?? null,
        max_speed_kmh: input.max_speed_kmh ?? null,
        calories: input.calories ?? null,
        photo_url: input.photo_url ?? null,
        route: input.route,
        notes: input.notes ?? null,
        title: input.title ?? null,
        color: input.color ?? null,
        location: input.location ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, input: {
    photo_url?: string | null
    notes?: string | null
    title?: string | null
    color?: string | null
    location?: string | null
  }) {
    const updateData: Record<string, any> = {}
    if (input.photo_url !== undefined) updateData.photo_url = input.photo_url
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.title !== undefined) updateData.title = input.title
    if (input.color !== undefined) updateData.color = input.color
    if (input.location !== undefined) updateData.location = input.location

    const { data, error } = await supabaseAdmin
      .from('walks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async remove(id: string) {
    const { error } = await supabaseAdmin
      .from('walks')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getStats(petId: string, start: string, end: string) {
    const { data, error } = await supabaseAdmin
      .from('walks')
      .select('started_at, distance_m, duration_s, calories')
      .eq('pet_id', petId)
      .gte('started_at', start)
      .lte('started_at', end)
      .not('ended_at', 'is', null)

    if (error) throw error
    return data as Pick<Walk, 'started_at' | 'distance_m' | 'duration_s' | 'calories'>[]
  },
}
