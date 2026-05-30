import { supabase } from '../config/supabase';
import { Vaccine } from '../data/models';
import { vaccineCacheRepository } from '../data/repositories/VaccineCacheRepository';
import { api } from './axios';

export const getVaccinesByPetId = async (petId: string): Promise<Vaccine[]> => {
  try {
    const { data, error } = await supabase
      .from('vaccines')
      .select('*')
      .eq('pet_id', petId)
      .order('applied_at', { ascending: false });

    if (error) throw new Error(error.message);

    const vaccines = data as Vaccine[];
    await vaccineCacheRepository.saveVaccines(petId, vaccines);
    return vaccines;
  } catch {
    const cached = await vaccineCacheRepository.getVaccines(petId);
    if (cached) return cached;
    throw new Error('Falha ao carregar vacinas');
  }
};

export const getVaccineById = async (vaccineId: string): Promise<Vaccine | null> => {
  try {
    const { data, error } = await supabase
      .from('vaccines')
      .select('*')
      .eq('id', vaccineId)
      .single();

    if (error) throw new Error(error.message);

    if (data) await vaccineCacheRepository.saveVaccineById(vaccineId, data as Vaccine);
    return data as Vaccine;
  } catch {
    return vaccineCacheRepository.getVaccineById(vaccineId);
  }
};

export const createVaccine = async (vaccineData: Omit<Vaccine, 'id' | 'created_at'>): Promise<Vaccine> => {
  const { data, error } = await supabase
    .from('vaccines')
    .insert([vaccineData])
    .select()
    .single();

  if (error) {
    console.error('Error creating vaccine:', error);
    throw new Error(error.message);
  }

  return data as Vaccine;
};

export const updateVaccine = async (vaccineId: string, updates: Partial<Vaccine>): Promise<Vaccine> => {
  const { data, error } = await supabase
    .from('vaccines')
    .update(updates)
    .eq('id', vaccineId)
    .select()
    .single();

  if (error) {
    console.error('Error updating vaccine:', error);
    throw new Error(error.message);
  }

  return data as Vaccine;
};

export const deleteVaccine = async (vaccineId: string): Promise<void> => {
  const { error } = await supabase
    .from('vaccines')
    .delete()
    .eq('id', vaccineId);

  if (error) {
    console.error('Error deleting vaccine:', error);
    throw new Error(error.message);
  }
};

export const generateVaccinationCard = async (
  petId: string,
  vaccineIds: string[]
): Promise<ArrayBuffer> => {
  const response = await api.post(
    `/pets/${petId}/vaccination-card`,
    { vaccineIds },
    { responseType: 'arraybuffer' }
  )
  return response.data as ArrayBuffer
};
