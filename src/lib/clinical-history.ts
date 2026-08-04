import { calculateHaversineDistance } from "@/lib/geo";

export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string; // Ejemplo: REC-2026-0042
  recordId: string;
  petName: string;
  tutorName: string;
  medications: MedicationItem[];
  instructions: string;
  date: string;
  vetName: string;
  vetLicense: string;
}

export interface ClinicalRecord {
  id: string; // Ejemplo: HC-2026-0042
  petId: string;
  petName: string;
  petSpecies: "Perro" | "Gato" | "Ave" | "Exótico" | "Otro";
  petSex: string;
  petAge: string;
  petWeight: string;
  tutorName: string;
  tutorEmail: string;
  modality: "video" | "domicilio" | "presencial";
  date: string; // ISO String
  vetName: string;
  vetLicense: string;
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  observations?: string;
  prescription?: Prescription;
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

// Base de Datos Georreferenciada de Farmacias Veterinarias y Pet Shops Clínicos
export const VET_PHARMACIES_DB: VetPharmacy[] = [
  {
    id: "pharm-1",
    name: "Farmacia Veterinaria Palermo 24hs",
    address: "Av. Santa Fe 3420, Palermo, CABA",
    lat: -34.588,
    lng: -58.412,
    phone: "+54 11 4825-9988",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.9,
  },
  {
    id: "pharm-2",
    name: "Central Vet & Farmacia Belgrano",
    address: "Av. Cabildo 1890, Belgrano, CABA",
    lat: -34.562,
    lng: -58.456,
    phone: "+54 11 4784-1122",
    isOpen24h: false,
    deliveryAvailable: true,
    rating: 4.8,
  },
  {
    id: "pharm-3",
    name: "Urgencias & Farmacia Caballito",
    address: "Av. Rivadavia 5100, Caballito, CABA",
    lat: -34.618,
    lng: -58.441,
    phone: "+54 11 4902-3344",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.7,
  },
  {
    id: "pharm-4",
    name: "Farmacia Veterinaria Recoleta Vet",
    address: "Av. Las Heras 2100, Recoleta, CABA",
    lat: -34.589,
    lng: -58.395,
    phone: "+54 11 4801-7766",
    isOpen24h: false,
    deliveryAvailable: false,
    rating: 4.6,
  },
  {
    id: "pharm-5",
    name: "Medivet Farmacia & Especialidades",
    address: "Av. Córdoba 4500, Villa Crespo, CABA",
    lat: -34.595,
    lng: -58.432,
    phone: "+54 11 4865-2010",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.9,
  },
  {
    id: "pharm-6",
    name: "Farmacia Veterinaria Zona Norte",
    address: "Av. Maipú 2300, Olivos, GBA Norte",
    lat: -34.512,
    lng: -58.489,
    phone: "+54 11 4790-8899",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.8,
  },
  {
    id: "pharm-7",
    name: "Farmacia Veterinaria Córdoba Capital",
    address: "Av. Colón 1250, Córdoba Capital",
    lat: -31.413,
    lng: -64.195,
    phone: "+54 351 422-5500",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.8,
  },
  {
    id: "pharm-8",
    name: "VetShop & Farmacia Rosario Centro",
    address: "Bulevar Oroño 850, Rosario, Santa Fe",
    lat: -32.947,
    lng: -60.654,
    phone: "+54 341 425-3311",
    isOpen24h: true,
    deliveryAvailable: true,
    rating: 4.7,
  },
];

const MOCK_CLINICAL_RECORDS: ClinicalRecord[] = [
  {
    id: "HC-2026-0028",
    petId: "pet-toby-1",
    petName: "Toby",
    petSpecies: "Perro",
    petSex: "Macho (Castrado)",
    petAge: "4 años",
    petWeight: "5.2 kg",
    tutorName: "Carlos Rossi",
    tutorEmail: "carlos.rossi@ejemplo.com",
    modality: "video",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    vetName: "Dr. Roberto Martínez",
    vetLicense: "MP 14290",
    symptoms: ["Prurito ótico leve", "Sacudidas frecuentes de cabeza"],
    diagnosis: "Otitis externa leve no supurativa bilateral.",
    treatment: "Limpieza auricular con solución antiséptica y gotas óticas antiinflamatorias.",
    observations: "Mascota receptiva al examen por video. Se recomienda control evolutivo en 7 días.",
    prescription: {
      id: "REC-2026-0028",
      recordId: "HC-2026-0028",
      petName: "Toby",
      tutorName: "Carlos Rossi",
      medications: [
        {
          name: "Otomicina Gotas Óticas",
          dose: "3 gotas en cada oído",
          frequency: "Cada 12 horas",
          duration: "7 días",
        },
        {
          name: "Limpiador Auricular Vet",
          dose: "1 aplicación previa",
          frequency: "Cada 24 horas",
          duration: "5 días",
        },
      ],
      instructions: "Masajear suavemente la base de la oreja tras aplicar las gotas.",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      vetName: "Dr. Roberto Martínez",
      vetLicense: "MP 14290",
    },
  },
  {
    id: "HC-2026-0012",
    petId: "pet-toby-1",
    petName: "Toby",
    petSpecies: "Perro",
    petSex: "Macho (Castrado)",
    petAge: "3 años y 10 meses",
    petWeight: "5.0 kg",
    tutorName: "Carlos Rossi",
    tutorEmail: "carlos.rossi@ejemplo.com",
    modality: "domicilio",
    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    vetName: "Dra. Sofía Almirón",
    vetLicense: "MP 14210",
    symptoms: ["Gastroenteritis leve por transgresión alimentaria", "Vómito aislado"],
    diagnosis: "Gastroenteritis alimentaria autolimitada sin deshidratación.",
    treatment: "Dieta blanda por 48 horas y protector gástrico oral.",
    observations: "Al examen presencial normohidratado, mucosas rosadas y abdomen blando no doloroso.",
    prescription: {
      id: "REC-2026-0012",
      recordId: "HC-2026-0012",
      petName: "Toby",
      tutorName: "Carlos Rossi",
      medications: [
        {
          name: "Sucralfato Vet 500mg",
          dose: "1/2 comprimido",
          frequency: "Cada 12 horas",
          duration: "3 días",
        },
      ],
      instructions: "Administrar 30 minutos antes de las comidas con agua limpia.",
      date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      vetName: "Dra. Sofía Almirón",
      vetLicense: "MP 14210",
    },
  },
];

/**
 * Genera un código único en formato HC-2026-XXXX para Historia Clínica
 */
export function generateClinicalRecordId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `HC-2026-${randomNum}`;
}

/**
 * Genera un código único en formato REC-2026-XXXX para Receta Digital
 */
export function generatePrescriptionId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REC-2026-${randomNum}`;
}

/**
 * Obtiene las historias clínicas persistidas o los registros iniciales
 */
export function getClinicalHistory(petId?: string): ClinicalRecord[] {
  if (typeof window === "undefined") {
    return MOCK_CLINICAL_RECORDS;
  }

  try {
    const saved = localStorage.getItem("avo_clinical_history");
    let records: ClinicalRecord[] = saved ? JSON.parse(saved) : MOCK_CLINICAL_RECORDS;

    if (!saved) {
      localStorage.setItem("avo_clinical_history", JSON.stringify(MOCK_CLINICAL_RECORDS));
    }

    if (petId && petId !== "Todos") {
      records = records.filter(
        (rec) =>
          rec.petId === petId ||
          rec.petName.toLowerCase() === petId.toLowerCase()
      );
    }

    // Ordenar por fecha decreciente (más recientes primero)
    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (err) {
    console.error("Error al cargar historia clínica desde localStorage:", err);
    return MOCK_CLINICAL_RECORDS;
  }
}

/**
 * Guarda una nueva historia clínica (y su receta electrónica) y retorna el listado actualizado
 */
export function saveClinicalRecord(newRecord: ClinicalRecord): ClinicalRecord[] {
  if (typeof window === "undefined") return [newRecord];

  try {
    const current = getClinicalHistory();
    const updated = [newRecord, ...current];
    localStorage.setItem("avo_clinical_history", JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Error al guardar historia clínica en localStorage:", err);
    return [newRecord];
  }
}

/**
 * Devuelve farmacias veterinarias cercanas ordenadas por proximidad en kilómetros
 */
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
