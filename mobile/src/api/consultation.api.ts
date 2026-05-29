import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../config/supabase';
import { Consultation } from '../data/models';

const CACHE_PREFIX = 'petlink.consultation.cache'

export const getConsultationsByPetId = async (petId: string): Promise<Consultation[]> => {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('pet_id', petId)
      .order('consulted_at', { ascending: false });

    if (error) throw new Error(error.message);

    await AsyncStorage.setItem(`${CACHE_PREFIX}.list.${petId}`, JSON.stringify(data));
    return data as Consultation[];
  } catch {
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}.list.${petId}`);
    if (cached) return JSON.parse(cached) as Consultation[];
    throw new Error('Falha ao carregar consultas');
  }
};

export const createConsultation = async (consultationData: Omit<Consultation, 'id' | 'created_at' | 'updated_at'>): Promise<Consultation> => {
  const { data, error } = await supabase
    .from('consultations')
    .insert([consultationData])
    .select()
    .single();

  if (error) {
    console.error('Error creating consultation:', error);
    throw new Error(error.message);
  }

  return data as Consultation;
};

export const updateConsultation = async (consultationId: string, updates: Partial<Consultation>): Promise<Consultation> => {
  const { data, error } = await supabase
    .from('consultations')
    .update(updates)
    .eq('id', consultationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating consultation:', error);
    throw new Error(error.message);
  }

  return data as Consultation;
};

export const deleteConsultation = async (consultationId: string): Promise<void> => {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', consultationId);

  if (error) {
    console.error('Error deleting consultation:', error);
    throw new Error(error.message);
  }
};
