import { supabaseAdmin } from '../../config/supabase'

export type VaccineData = {
  id: string
  name: string
  type: 'vaccine' | 'dewormer'
  applied_at: string
  next_dose_at: string | null
  lab: string | null
  is_completed: boolean
  doses: { date: string; applied: boolean }[]
}

export type PetData = {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner_id: string
}

export type OwnerData = {
  name: string
  avatar_url: string | null
}

export const vaccinationCardRepository = {
  async getPet(petId: string): Promise<PetData | null> {
    const { data, error } = await supabaseAdmin
      .from('pets')
      .select('id, name, species, breed, photo_url, owner_id')
      .eq('id', petId)
      .single()

    if (error) return null
    return data as PetData
  },

  async getOwner(ownerId: string): Promise<OwnerData | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', ownerId)
      .single()

    if (error) return null
    return data as OwnerData
  },

  async getVaccines(petId: string, vaccineIds: string[]): Promise<VaccineData[]> {
    const { data, error } = await supabaseAdmin
      .from('vaccines')
      .select('id, name, type, applied_at, next_dose_at, lab, is_completed, doses')
      .eq('pet_id', petId)
      .in('id', vaccineIds)
      .order('applied_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as VaccineData[]
  },

  async getAllVaccines(petId: string): Promise<VaccineData[]> {
    const { data, error } = await supabaseAdmin
      .from('vaccines')
      .select('id, name, type, applied_at, next_dose_at, lab, is_completed, doses')
      .eq('pet_id', petId)
      .order('applied_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as VaccineData[]
  },
}
