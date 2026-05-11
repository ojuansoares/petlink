export type Vaccine = {
  id: string;
  pet_id: string;
  owner_id: string;
  name: string;
  type: 'vaccine' | 'dewormer';
  applied_at: string;
  next_dose_at?: string;
  lab?: string;
  batch?: string;
  vet_name?: string;
  notes?: string;
  notified: boolean;
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
    created_at: string;
    updated_at: string;
};
