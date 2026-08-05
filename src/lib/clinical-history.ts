/**
 * AVO-Beta V1.0.0 — Clinical History Engine (DB-Backed)
 * 
 * CRITICAL CHANGE: All clinical data is now persisted in MySQL via Prisma.
 * localStorage has been completely eliminated for medical records.
 * 
 * Data hierarchy:
 *   Tutor → Pet → ClinicalEncounter → Prescription → PrescriptionItem
 *                  └→ Attachment (images, lab results)
 *                  └→ VaccinationRecord
 */

import { prisma } from '@/lib/prisma';
import { calculateHaversineDistance } from '@/lib/geo';

// ─────────────────────────────────────────────
// Types (API-facing)
// ─────────────────────────────────────────────

export interface MedicationItem {
  name: string;
  dose: string;
  route?: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionInput {
  medications: MedicationItem[];
  instructions: string;
}

export interface ClinicalEncounterInput {
  petId: string;
  vetId: string;
  dispatchId?: string;
  modality: 'video' | 'domicilio';
  chiefComplaint: string;
  anamnesis?: string;
  physicalExam?: string;
  diagnosis: string;
  differentialDiagnosis?: string;
  treatment: string;
  prognosis?: string;
  observations?: string;
  prescription?: PrescriptionInput;
}

export interface ClinicalEncounterSummary {
  id: string;
  code: string;
  petId: string;
  petName: string;
  petSpecies: string;
  modality: string;
  date: string;
  vetName: string;
  vetLicense: string;
  diagnosis: string;
  hasPrescription: boolean;
  attachmentCount: number;
}

export interface ClinicalEncounterDetail {
  id: string;
  code: string;
  petId: string;
  petName: string;
  petSpecies: string;
  petBreed: string | null;
  petSex: string | null;
  petAge: string | null;
  petWeight: number | null;
  tutorName: string;
  tutorEmail: string;
  modality: string;
  date: string;
  vetName: string;
  vetLicense: string;
  chiefComplaint: string;
  anamnesis: string | null;
  physicalExam: string | null;
  diagnosis: string;
  differentialDiagnosis: string | null;
  treatment: string;
  prognosis: string | null;
  observations: string | null;
  signatureHash: string | null;
  signedAt: string | null;
  prescriptions: Array<{
    id: string;
    code: string;
    instructions: string | null;
    signatureHash: string | null;
    verificationUrl: string | null;
    issuedAt: string;
    items: MedicationItem[];
  }>;
  attachments: Array<{
    id: string;
    type: string;
    fileName: string;
    mimeType: string;
  }>;
}

export interface VetPharmacy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  isOpen24h: boolean;
  deliveryAvailable: boolean;
  rating: number;
  distanceKm?: number;
}

// ─────────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────────

/**
 * Generate sequential clinical record code: HC-YYYY-NNNN
 */
export async function generateEncounterCode(): Promise<string> {
  const year = new Date().getFullYear();
  const lastRecord = await prisma.clinicalEncounter.findFirst({
    where: { code: { startsWith: `HC-${year}-` } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastRecord) {
    const parts = lastRecord.code.split('-');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `HC-${year}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generate sequential prescription code: REC-YYYY-NNNN
 */
export async function generatePrescriptionCode(): Promise<string> {
  const year = new Date().getFullYear();
  const lastRx = await prisma.prescription.findFirst({
    where: { code: { startsWith: `REC-${year}-` } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNum = 1;
  if (lastRx) {
    const parts = lastRx.code.split('-');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `REC-${year}-${String(nextNum).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────
// CRUD Operations
// ─────────────────────────────────────────────

/**
 * Create a new clinical encounter with optional prescription.
 */
export async function createClinicalEncounter(
  input: ClinicalEncounterInput
): Promise<{ encounterId: string; encounterCode: string; prescriptionCode?: string }> {
  const encounterCode = await generateEncounterCode();

  return prisma.$transaction(async (tx) => {
    // Create encounter
    const encounter = await tx.clinicalEncounter.create({
      data: {
        code: encounterCode,
        petId: input.petId,
        vetId: input.vetId,
        dispatchId: input.dispatchId,
        modality: input.modality,
        chiefComplaint: input.chiefComplaint,
        anamnesis: input.anamnesis,
        physicalExam: input.physicalExam,
        diagnosis: input.diagnosis,
        differentialDiagnosis: input.differentialDiagnosis,
        treatment: input.treatment,
        prognosis: input.prognosis,
        observations: input.observations,
      },
    });

    let prescriptionCode: string | undefined;

    // Create prescription if provided
    if (input.prescription && input.prescription.medications.length > 0) {
      prescriptionCode = await generatePrescriptionCode();

      await tx.prescription.create({
        data: {
          code: prescriptionCode,
          encounterId: encounter.id,
          petId: input.petId,
          vetId: input.vetId,
          instructions: input.prescription.instructions,
          items: {
            create: input.prescription.medications.map((med) => ({
              drugName: med.name,
              dose: med.dose,
              route: med.route || 'oral',
              frequency: med.frequency,
              duration: med.duration,
            })),
          },
        },
      });
    }

    return {
      encounterId: encounter.id,
      encounterCode,
      prescriptionCode,
    };
  });
}

/**
 * Get clinical history timeline for a specific pet.
 * Returns summaries ordered by date (most recent first).
 */
export async function getPetClinicalHistory(
  petId: string
): Promise<ClinicalEncounterSummary[]> {
  const encounters = await prisma.clinicalEncounter.findMany({
    where: { petId },
    include: {
      pet: { select: { name: true, species: true } },
      vet: { select: { name: true, licenseNumber: true } },
      prescriptions: { select: { id: true } },
      attachments: { select: { id: true } },
    },
    orderBy: { date: 'desc' },
  });

  return encounters.map((e) => ({
    id: e.id,
    code: e.code,
    petId: e.petId,
    petName: e.pet.name,
    petSpecies: e.pet.species,
    modality: e.modality,
    date: e.date.toISOString(),
    vetName: e.vet.name || 'Sin nombre',
    vetLicense: e.vet.licenseNumber || 'Sin matrícula',
    diagnosis: e.diagnosis,
    hasPrescription: e.prescriptions.length > 0,
    attachmentCount: e.attachments.length,
  }));
}

/**
 * Get full clinical encounter details including prescriptions and attachments.
 */
export async function getClinicalEncounterDetail(
  encounterId: string
): Promise<ClinicalEncounterDetail | null> {
  const e = await prisma.clinicalEncounter.findUnique({
    where: { id: encounterId },
    include: {
      pet: {
        include: {
          tutor: { select: { name: true, email: true } },
        },
      },
      vet: { select: { name: true, licenseNumber: true } },
      prescriptions: {
        include: {
          items: true,
        },
      },
      attachments: true,
    },
  });

  if (!e) return null;

  return {
    id: e.id,
    code: e.code,
    petId: e.petId,
    petName: e.pet.name,
    petSpecies: e.pet.species,
    petBreed: e.pet.breed,
    petSex: e.pet.sex,
    petAge: e.pet.age,
    petWeight: e.pet.weightKg,
    tutorName: e.pet.tutor.name || 'Sin nombre',
    tutorEmail: e.pet.tutor.email || '',
    modality: e.modality,
    date: e.date.toISOString(),
    vetName: e.vet.name || 'Sin nombre',
    vetLicense: e.vet.licenseNumber || 'Sin matrícula',
    chiefComplaint: e.chiefComplaint,
    anamnesis: e.anamnesis,
    physicalExam: e.physicalExam,
    diagnosis: e.diagnosis,
    differentialDiagnosis: e.differentialDiagnosis,
    treatment: e.treatment,
    prognosis: e.prognosis,
    observations: e.observations,
    signatureHash: e.signatureHash,
    signedAt: e.signedAt?.toISOString() || null,
    prescriptions: e.prescriptions.map((rx) => ({
      id: rx.id,
      code: rx.code,
      instructions: rx.instructions,
      signatureHash: rx.signatureHash,
      verificationUrl: rx.verificationUrl,
      issuedAt: rx.issuedAt.toISOString(),
      items: rx.items.map((item) => ({
        name: item.drugName,
        dose: item.dose,
        route: item.route || undefined,
        frequency: item.frequency,
        duration: item.duration,
      })),
    })),
    attachments: e.attachments.map((a) => ({
      id: a.id,
      type: a.type,
      fileName: a.fileName,
      mimeType: a.mimeType,
    })),
  };
}

/**
 * Get all clinical encounters across all pets for a tutor.
 */
export async function getTutorClinicalHistory(
  tutorId: string,
  petId?: string
): Promise<ClinicalEncounterSummary[]> {
  const pets = await prisma.pet.findMany({
    where: { tutorId },
    select: { id: true },
  });

  const petIds = petId ? [petId] : pets.map((p) => p.id);

  const encounters = await prisma.clinicalEncounter.findMany({
    where: { petId: { in: petIds } },
    include: {
      pet: { select: { name: true, species: true } },
      vet: { select: { name: true, licenseNumber: true } },
      prescriptions: { select: { id: true } },
      attachments: { select: { id: true } },
    },
    orderBy: { date: 'desc' },
  });

  return encounters.map((e) => ({
    id: e.id,
    code: e.code,
    petId: e.petId,
    petName: e.pet.name,
    petSpecies: e.pet.species,
    modality: e.modality,
    date: e.date.toISOString(),
    vetName: e.vet.name || 'Sin nombre',
    vetLicense: e.vet.licenseNumber || 'Sin matrícula',
    diagnosis: e.diagnosis,
    hasPrescription: e.prescriptions.length > 0,
    attachmentCount: e.attachments.length,
  }));
}

// ─────────────────────────────────────────────
// Nearby Pharmacies (Static DB — retained from V0)
// ─────────────────────────────────────────────

const VET_PHARMACIES_DB: VetPharmacy[] = [
  { id: 'pharm-1', name: 'Farmacia Veterinaria Palermo 24hs', address: 'Av. Santa Fe 3420, Palermo, CABA', lat: -34.588, lng: -58.412, phone: '+54 11 4825-9988', isOpen24h: true, deliveryAvailable: true, rating: 4.9 },
  { id: 'pharm-2', name: 'Central Vet & Farmacia Belgrano', address: 'Av. Cabildo 1890, Belgrano, CABA', lat: -34.562, lng: -58.456, phone: '+54 11 4784-1122', isOpen24h: false, deliveryAvailable: true, rating: 4.8 },
  { id: 'pharm-3', name: 'Urgencias & Farmacia Caballito', address: 'Av. Rivadavia 5100, Caballito, CABA', lat: -34.618, lng: -58.441, phone: '+54 11 4902-3344', isOpen24h: true, deliveryAvailable: true, rating: 4.7 },
  { id: 'pharm-4', name: 'Farmacia Veterinaria Recoleta Vet', address: 'Av. Las Heras 2100, Recoleta, CABA', lat: -34.589, lng: -58.395, phone: '+54 11 4801-7766', isOpen24h: false, deliveryAvailable: false, rating: 4.6 },
  { id: 'pharm-5', name: 'Medivet Farmacia & Especialidades', address: 'Av. Córdoba 4500, Villa Crespo, CABA', lat: -34.595, lng: -58.432, phone: '+54 11 4865-2010', isOpen24h: true, deliveryAvailable: true, rating: 4.9 },
  { id: 'pharm-6', name: 'Farmacia Veterinaria Zona Norte', address: 'Av. Maipú 2300, Olivos, GBA Norte', lat: -34.512, lng: -58.489, phone: '+54 11 4790-8899', isOpen24h: true, deliveryAvailable: true, rating: 4.8 },
  { id: 'pharm-7', name: 'Farmacia Veterinaria Córdoba Capital', address: 'Av. Colón 1250, Córdoba Capital', lat: -31.413, lng: -64.195, phone: '+54 351 422-5500', isOpen24h: true, deliveryAvailable: true, rating: 4.8 },
  { id: 'pharm-8', name: 'VetShop & Farmacia Rosario Centro', address: 'Bulevar Oroño 850, Rosario, Santa Fe', lat: -32.947, lng: -60.654, phone: '+54 341 425-3311', isOpen24h: true, deliveryAvailable: true, rating: 4.7 },
];

export function getNearbyPharmacies(
  lat: number,
  lng: number,
  maxRadiusKm = 25
): VetPharmacy[] {
  return VET_PHARMACIES_DB.map((pharm) => {
    const distance = calculateHaversineDistance(lat, lng, pharm.lat, pharm.lng);
    return {
      ...pharm,
      distanceKm: Number(distance.toFixed(1)),
    };
  })
    .filter((pharm) => (pharm.distanceKm || 0) <= maxRadiusKm)
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}
