import { supabase } from '../config/supabase';
import { Consultation } from '../data/models';

export const getConsultationsByPetId = async (petId: string): Promise<Consultation[]> => {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('pet_id', petId)
    .order('consulted_at', { ascending: false });

  if (error) {
    console.error('Error fetching consultations:', error);
    throw new Error(error.message);
  }

  return data as Consultation[];
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
