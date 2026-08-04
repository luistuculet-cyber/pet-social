export type UserRole = "tutor" | "vet" | "manager" | "admin";
export type DispatchStatus = "pending" | "offered" | "accepted" | "en_route" | "in_progress" | "completed" | "cancelled";
export type ServiceType = "video" | "domicilio";
export type VetDocType = "dni" | "title" | "license" | "insurance";

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  licenseNumber?: string;
  university?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  actionRadiusKm?: number;
}

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  phone?: string;
  cbu?: string;
  title_document_url?: string;
  base_address?: string;
  base_lat?: number;
  base_lng?: number;
  action_radius_km?: number;
  verification_status?: 'pending' | 'approved' | 'rejected';
  is_premium?: boolean;
  pet_profiles_count?: number;
}

export interface VetAvailability {
  vet_id: string;
  is_available: boolean;
  lat: number;
  lng: number;
}

export interface DispatchRequest {
  id: string;
  tutor_id: string;
  lat: number;
  lng: number;
  status: DispatchStatus | string;
  modality?: ServiceType;
  serviceType?: ServiceType;
  vet_id?: string;
  price: number;
  created_at: string;
  vet?: { name?: string; phone?: string; id?: string };
  tutorName?: string;
  petName?: string;
  petSpecies?: string;
  symptoms?: string;
  [key: string]: unknown;
}

export interface MedicalRecord {
  id: string;
  dispatch_id: string;
  pet_name: string;
  pet_species: 'dog' | 'cat' | 'other' | string;
  pet_breed?: string;
  pet_age?: string;
  pet_weight?: string;
  diagnosis: string;
  treatment: string;
  post_care_instructions?: string;
  created_at: string;
}
