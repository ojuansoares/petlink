import { supabaseAdmin } from '../../config/supabase'

export type PetCreateInput = {
  pet_id?: never
  owner_id?: never
  name: string
  species: string
  breed?: string | null
  birth_date?: string | null
  weight_kg?: number | null
  weight_history?: Array<{ weight: number; date: string }> | null
  photo_url?: string | null
  allergies?: string | null
  temperament?: string | null
  observations?: string | null
}

export const petsRepository = {
  async findByOwnerAndName(ownerId: string, name: string) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId)
      .ilike('name', name)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async findByOwnerAndNameExcludingId(ownerId: string, name: string, excludePetId: string) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId)
      .ilike('name', name)
      .neq('id', excludePetId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async create(ownerId: string, input: PetCreateInput) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .insert({
        owner_id: ownerId,
        name: input.name,
        species: input.species,
        breed: input.breed ?? null,
        birth_date: input.birth_date ?? null,
        weight_kg: input.weight_kg ?? null,
        weight_history: input.weight_history ?? [],
        photo_url: input.photo_url ?? null,
        allergies: input.allergies ?? null,
        temperament: input.temperament ?? null,
        observations: input.observations ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async listByOwner(ownerId: string) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async findByIdAndOwner(ownerId: string, petId: string) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('*')
      .eq('id', petId)
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async updateByIdAndOwner(
    ownerId: string,
    petId: string,
    patch: Partial<{
      name: string
      species: string
      breed: string | null
      birth_date: string | null
      weight_kg: number | null
      weight_history: Array<{ weight: number; date: string }> | null
      photo_url: string | null
      allergies: string | null
      temperament: string | null
      observations: string | null
      is_active: boolean
    }>
  ) {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .update(patch)
      .eq('id', petId)
      .eq('owner_id', ownerId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    return data
  },

  async deleteCascadeByIdAndOwner(ownerId: string, petId: string) {
    // Garante ownership antes de apagar qualquer coisa
    const { data: pet, error: findError } = await supabaseAdmin
      .from('pets')
      .select('id, owner_id')
      .eq('id', petId)
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (findError) throw findError
    if (!pet) return false

    // Consultas ligadas ao pet
    const { data: consultations, error: consultationsError } = await supabaseAdmin
      .from('consultations')
      .select('id')
      .eq('pet_id', petId)

    if (consultationsError) throw consultationsError

    const consultationIds = (consultations ?? []).map((c: any) => c.id)

    if (consultationIds.length > 0) {
      const { error: attachmentsDeleteError } = await supabaseAdmin
        .from('consultation_attachments')
        .delete()
        .in('consultation_id', consultationIds)

      if (attachmentsDeleteError) throw attachmentsDeleteError
    }

    const { error: consultationsDeleteError } = await supabaseAdmin
      .from('consultations')
      .delete()
      .eq('pet_id', petId)

    if (consultationsDeleteError) throw consultationsDeleteError

    const { error: calendarDeleteError } = await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('pet_id', petId)

    if (calendarDeleteError) throw calendarDeleteError

    const { error: remindersDeleteError } = await supabaseAdmin
      .from('medication_reminders')
      .delete()
      .eq('pet_id', petId)

    if (remindersDeleteError) throw remindersDeleteError

    const { error: vaccinesDeleteError } = await supabaseAdmin
      .from('vaccines')
      .delete()
      .eq('pet_id', petId)

    if (vaccinesDeleteError) throw vaccinesDeleteError

    const { error: walksDeleteError } = await supabaseAdmin
      .from('walks')
      .delete()
      .eq('pet_id', petId)

    if (walksDeleteError) throw walksDeleteError

    const { error: weightsDeleteError } = await supabaseAdmin
      .from('weight_records')
      .delete()
      .eq('pet_id', petId)

    if (weightsDeleteError) throw weightsDeleteError

    const { error: petDeleteError } = await supabaseAdmin
      .from('pets')
      .delete()
      .eq('id', petId)
      .eq('owner_id', ownerId)

    if (petDeleteError) throw petDeleteError

    return true
  },
}

