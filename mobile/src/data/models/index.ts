export interface VaccineDose {
  date: string
  applied: boolean
}

export type Vaccine = {
  id: string;
  pet_id: string;
  owner_id: string;
  name: string;
  type: 'vaccine' | 'dewormer';
  applied_at: string;
  next_dose_at?: string;
  doses?: VaccineDose[];
  lab?: string;
  batch?: string;
  vet_name?: string;
  notes?: string;
  notified: boolean;
  is_completed: boolean;
  created_at: string;
};

export type Consultation = {
    id: string;
    pet_id: string;
    owner_id: string;
    vet_name: string;
    clinic?: string;
    consulted_at: string;
    reason: string;
    diagnosis?: string;
    exams_requested?: string;
    prescription?: string;
    notes?: string;
    place_osm_id?: number | null;
    place_osm_type?: string | null;
    place_name?: string | null;
    place_address?: string | null;
    place_lat?: number | null;
    place_lng?: number | null;
    place_category?: string | null;
    created_at: string;
    updated_at: string;
};
