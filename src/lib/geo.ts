/**
 * AVO Geospatial Matching Engine (Tipo Uber / Cabify)
 * Implementa cálculo geodésico preciso de Haversine y optimización de Bounding Box SQL
 * para filtrar veterinarios en tiempo real según su radio de cobertura individual.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface VetGeoCandidate {
  id: string;
  name: string | null;
  email: string | null;
  lat: number;
  lng: number;
  actionRadiusKm: number;
  isOnline: boolean;
}

export interface MatchedVet extends VetGeoCandidate {
  distanceKm: number;
  estimatedEtaMinutes: number;
}

/**
 * Calcula la distancia exacta en kilómetros entre dos coordenadas usando la Fórmula de Haversine
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Redondeado a 2 decimales
}

/**
 * Genera un Bounding Box (caja delimitadora) para consultas SQL indexadas ultrarrápidas
 */
export function getBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): BoundingBox {
  const latDelta = radiusKm / 111.045; // ~111 km por grado de latitud
  const lngDelta =
    radiusKm / (111.045 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
}

/**
 * Verifica si dos puntos están dentro del radio especificado
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number
): boolean {
  return calculateHaversineDistance(lat1, lng1, lat2, lng2) <= radiusKm;
}

/**
 * Filtra y ordena los veterinarios candidatos por cercanía y radio de acción (Uber-style matching)
 * @param tutorLat Latitud del domicilio de la urgencia
 * @param tutorLng Longitud del domicilio de la urgencia
 * @param candidates Lista de veterinarios online y con coordenadas
 */
export function matchVetsByRadius(
  tutorLat: number,
  tutorLng: number,
  candidates: VetGeoCandidate[]
): MatchedVet[] {
  const matched: MatchedVet[] = [];

  for (const vet of candidates) {
    if (!vet.isOnline || vet.lat == null || vet.lng == null) continue;

    const distKm = calculateHaversineDistance(
      tutorLat,
      tutorLng,
      vet.lat,
      vet.lng
    );

    // Verificar si el domicilio del tutor cae dentro del radio definido por el veterinario (o 15 km por defecto)
    const maxRadius = vet.actionRadiusKm || 15;

    if (distKm <= maxRadius) {
      // Cálculo de ETA (estimación de tiempo en minutos, considerando velocidad urbana media 25 km/h + 3 min de apronte)
      const estimatedEtaMinutes = Math.max(
        5,
        Math.round((distKm / 25) * 60 + 3)
      );

      matched.push({
        ...vet,
        distanceKm: distKm,
        estimatedEtaMinutes,
      });
    }
  }

  // Ordenar por distancia más cercana primero
  return matched.sort((a, b) => a.distanceKm - b.distanceKm);
}
