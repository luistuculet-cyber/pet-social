/**
 * AVO-Beta V1.0.0 — Prescription Signer (SHA-256 Cryptographic Signature)
 * 
 * Provides:
 * 1. Canonical serialization of prescription content
 * 2. SHA-256 hash generation (firma electrónica simple — Ley 25.506 Argentina)
 * 3. Public verification URL generation
 * 4. Encounter signing (HC + all prescriptions)
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface SignatureResult {
  hash: string;
  signedAt: string;
  verificationUrl: string;
  canonicalContent: string;
}

export interface EncounterSignatureResult {
  encounterHash: string;
  prescriptionHashes: Array<{ prescriptionId: string; hash: string; verificationUrl: string }>;
  signedAt: string;
}

// ─────────────────────────────────────────────
// Canonical Serialization
// ─────────────────────────────────────────────

/**
 * Creates a deterministic JSON string for hashing.
 * Keys are sorted alphabetically to ensure consistent hashing.
 */
function canonicalize(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

// ─────────────────────────────────────────────
// SHA-256 Hashing
// ─────────────────────────────────────────────

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// ─────────────────────────────────────────────
// Verification URL
// ─────────────────────────────────────────────

function buildVerificationUrl(type: 'hc' | 'rx', code: string, hashPrefix: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://avo.totalia.com.ar';
  return `${baseUrl}/verify/${type}/${code}/${hashPrefix}`;
}

// ─────────────────────────────────────────────
// Sign a Prescription
// ─────────────────────────────────────────────

export async function signPrescription(prescriptionId: string): Promise<SignatureResult> {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      items: { orderBy: { drugName: 'asc' } },
      pet: { select: { name: true, species: true } },
      vet: { select: { name: true, licenseNumber: true } },
    },
  });

  if (!rx) throw new Error(`Prescription ${prescriptionId} not found`);

  const canonicalContent = canonicalize({
    code: rx.code,
    petName: rx.pet.name,
    petSpecies: rx.pet.species,
    vetName: rx.vet.name,
    vetLicense: rx.vet.licenseNumber,
    medications: rx.items.map((item) => ({
      drug: item.drugName,
      dose: item.dose,
      route: item.route,
      frequency: item.frequency,
      duration: item.duration,
    })),
    instructions: rx.instructions,
    issuedAt: rx.issuedAt.toISOString(),
  });

  const hash = sha256(canonicalContent);
  const signedAt = new Date().toISOString();
  const verificationUrl = buildVerificationUrl('rx', rx.code, hash.slice(0, 12));

  // Persist signature
  await prisma.prescription.update({
    where: { id: prescriptionId },
    data: {
      signatureHash: hash,
      verificationUrl,
    },
  });

  return { hash, signedAt, verificationUrl, canonicalContent };
}

// ─────────────────────────────────────────────
// Sign a Clinical Encounter (HC + all Prescriptions)
// ─────────────────────────────────────────────

export async function signEncounter(encounterId: string): Promise<EncounterSignatureResult> {
  const encounter = await prisma.clinicalEncounter.findUnique({
    where: { id: encounterId },
    include: {
      pet: { select: { name: true, species: true } },
      vet: { select: { name: true, licenseNumber: true } },
      prescriptions: { select: { id: true } },
    },
  });

  if (!encounter) throw new Error(`Encounter ${encounterId} not found`);

  // Sign the encounter itself
  const encounterCanonical = canonicalize({
    code: encounter.code,
    petName: encounter.pet.name,
    petSpecies: encounter.pet.species,
    vetName: encounter.vet.name,
    vetLicense: encounter.vet.licenseNumber,
    modality: encounter.modality,
    chiefComplaint: encounter.chiefComplaint,
    diagnosis: encounter.diagnosis,
    treatment: encounter.treatment,
    date: encounter.date.toISOString(),
  });

  const encounterHash = sha256(encounterCanonical);
  const signedAt = new Date();

  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      signatureHash: encounterHash,
      signedAt,
    },
  });

  // Sign all associated prescriptions
  const prescriptionHashes: EncounterSignatureResult['prescriptionHashes'] = [];

  for (const rx of encounter.prescriptions) {
    const result = await signPrescription(rx.id);
    prescriptionHashes.push({
      prescriptionId: rx.id,
      hash: result.hash,
      verificationUrl: result.verificationUrl,
    });
  }

  return {
    encounterHash,
    prescriptionHashes,
    signedAt: signedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────
// Verify Signature (Public Endpoint)
// ─────────────────────────────────────────────

export interface VerificationResult {
  valid: boolean;
  type: 'encounter' | 'prescription';
  code: string;
  signedAt: string | null;
  vetName: string;
  vetLicense: string;
  petName: string;
  message: string;
}

export async function verifyEncounterSignature(
  code: string,
  hashPrefix: string
): Promise<VerificationResult> {
  const encounter = await prisma.clinicalEncounter.findUnique({
    where: { code },
    include: {
      pet: { select: { name: true } },
      vet: { select: { name: true, licenseNumber: true } },
    },
  });

  if (!encounter) {
    return {
      valid: false,
      type: 'encounter',
      code,
      signedAt: null,
      vetName: '',
      vetLicense: '',
      petName: '',
      message: 'Historia clínica no encontrada.',
    };
  }

  const isValid = encounter.signatureHash?.startsWith(hashPrefix) ?? false;

  return {
    valid: isValid,
    type: 'encounter',
    code,
    signedAt: encounter.signedAt?.toISOString() || null,
    vetName: encounter.vet.name || 'Sin nombre',
    vetLicense: encounter.vet.licenseNumber || 'Sin matrícula',
    petName: encounter.pet.name,
    message: isValid
      ? 'Firma verificada correctamente. Documento auténtico.'
      : 'Firma no coincide. Documento posiblemente alterado.',
  };
}

export async function verifyPrescriptionSignature(
  code: string,
  hashPrefix: string
): Promise<VerificationResult> {
  const rx = await prisma.prescription.findUnique({
    where: { code },
    include: {
      pet: { select: { name: true } },
      vet: { select: { name: true, licenseNumber: true } },
    },
  });

  if (!rx) {
    return {
      valid: false,
      type: 'prescription',
      code,
      signedAt: null,
      vetName: '',
      vetLicense: '',
      petName: '',
      message: 'Receta no encontrada.',
    };
  }

  const isValid = rx.signatureHash?.startsWith(hashPrefix) ?? false;

  return {
    valid: isValid,
    type: 'prescription',
    code,
    signedAt: rx.issuedAt.toISOString(),
    vetName: rx.vet.name || 'Sin nombre',
    vetLicense: rx.vet.licenseNumber || 'Sin matrícula',
    petName: rx.pet.name,
    message: isValid
      ? 'Firma de receta verificada. Documento auténtico.'
      : 'Firma no coincide. Receta posiblemente alterada.',
  };
}
