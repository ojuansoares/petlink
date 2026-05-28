import { supabase } from '../config/supabase';
import { Vaccine } from '../data/models';

export const getVaccinesByPetId = async (petId: string): Promise<Vaccine[]> => {
  const { data, error } = await supabase
    .from('vaccines')
    .select('*')
    .eq('pet_id', petId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('Error fetching vaccines:', error);
    throw new Error(error.message);
  }

  return data as Vaccine[];
};

export const getVaccineById = async (vaccineId: string): Promise<Vaccine | null> => {
  const { data, error } = await supabase
    .from('vaccines')
    .select('*')
    .eq('id', vaccineId)
    .single();

  if (error) {
    console.error('Error fetching vaccine:', error);
    return null;
  }

  return data as Vaccine;
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
