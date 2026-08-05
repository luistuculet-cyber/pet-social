/**
 * AVO-Beta V1.0.0 — Geospatial Matching Engine
 * 
 * Three-layer geospatial strategy:
 * 1. H3 Hexagonal Index (primary) — O(1) cell lookups via Redis SETs
 * 2. Redis GEO (secondary) — GEOSEARCH for distance-sorted results
 * 3. Google Routes API (ETA) — Real traffic-aware travel time
 * 
 * Haversine retained for fallback and offline distance calculations.
 */

import { findVetsInRadius, getVetsInH3Cells, getOnlineVideoVets } from '@/lib/redis';
import { MATCHING_TIERS, type TierConfig } from '@/lib/state-machine';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

export interface MatchedVet {
  id: string;
  distanceKm: number;
  estimatedEtaMinutes: number;
  matchSource: 'h3' | 'redis_geo' | 'bounding_box';
}

export interface VetWithEta extends VetGeoCandidate {
  distanceKm: number;
  estimatedEtaMinutes: number;
  matchSource: 'h3' | 'redis_geo' | 'bounding_box';
}

// ─────────────────────────────────────────────
// Core: Haversine Distance (fallback)
// ─────────────────────────────────────────────

export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Bounding box for SQL-level pre-filtering (MySQL index-friendly).
 */
export function getBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): BoundingBox {
  const latDelta = radiusKm / 111.045;
  const lngDelta =
    radiusKm / (111.045 * Math.cos((centerLat * Math.PI) / 180));

  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta,
  };
}

export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number
): boolean {
  return calculateHaversineDistance(lat1, lng1, lat2, lng2) <= radiusKm;
}

// ─────────────────────────────────────────────
// H3 Hexagonal Index Integration
// ─────────────────────────────────────────────

/**
 * Convert lat/lng to H3 index at resolution 7 (~5.16 km²).
 * Uses dynamic import to handle h3-js which is ESM-only.
 */
export async function latLngToH3(lat: number, lng: number, resolution: number = 7): Promise<string> {
  const h3 = await import('h3-js');
  return h3.latLngToCell(lat, lng, resolution);
}

/**
 * Get H3 cells in an expanding ring around a center cell.
 * Ring 0 = center cell only, Ring 1 = center + immediate neighbors, etc.
 */
export async function getH3Ring(centerLat: number, centerLng: number, ringSize: number): Promise<string[]> {
  const h3 = await import('h3-js');
  const centerCell = h3.latLngToCell(centerLat, centerLng, 7);
  return h3.gridDisk(centerCell, ringSize);
}

/**
 * Map tier radius to H3 ring size.
 * At resolution 7, edge length ≈ 1.22 km, so:
 * - 5 km radius → ring 2 (~2.44 km edge coverage)
 * - 10 km radius → ring 4
 * - 20 km radius → ring 8
 */
export function tierToH3RingSize(tier: TierConfig): number {
  const edgeLengthKm = 1.22; // H3 res 7 edge length
  return Math.ceil(tier.radiusKm / edgeLengthKm);
}

// ─────────────────────────────────────────────
// Domicilio Matching: H3 → Redis GEO → Sort
// ─────────────────────────────────────────────

/**
 * Find candidate vets for domicilio within a given tier.
 * Strategy:
 * 1. Get H3 ring cells for the tier radius
 * 2. Fetch vetIds from Redis H3 cell SETs
 * 3. Cross-reference with Redis GEO for precise distance
 * 4. Return sorted by distance
 */
export async function findDomicilioCandidates(
  tutorLat: number,
  tutorLng: number,
  tier: TierConfig,
  excludeVetIds: string[] = []
): Promise<MatchedVet[]> {
  const excludeSet = new Set(excludeVetIds);

  try {
    // Strategy 1: H3 ring + Redis GEO cross-reference
    const ringSize = tierToH3RingSize(tier);
    const h3Cells = await getH3Ring(tutorLat, tutorLng, ringSize);
    const h3VetIds = await getVetsInH3Cells(h3Cells);

    if (h3VetIds.length > 0) {
      // Refine with Redis GEO for exact distances
      const geoResults = await findVetsInRadius(tutorLng, tutorLat, tier.radiusKm, 50);

      const h3Set = new Set(h3VetIds);
      const matched: MatchedVet[] = [];

      for (const { vetId, distanceKm } of geoResults) {
        if (excludeSet.has(vetId)) continue;
        if (!h3Set.has(vetId)) continue; // Must be in H3 ring AND GEO radius

        matched.push({
          id: vetId,
          distanceKm,
          estimatedEtaMinutes: estimateEtaFallback(distanceKm),
          matchSource: 'h3',
        });
      }

      if (matched.length > 0) {
        return matched.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
  } catch (err) {
    console.warn('[AVO Geo] H3 lookup failed, falling back to Redis GEO only:', err);
  }

  // Strategy 2: Redis GEO only (fallback if H3 not populated)
  try {
    const geoResults = await findVetsInRadius(tutorLng, tutorLat, tier.radiusKm, 50);
    const matched: MatchedVet[] = geoResults
      .filter(({ vetId }) => !excludeSet.has(vetId))
      .map(({ vetId, distanceKm }) => ({
        id: vetId,
        distanceKm,
        estimatedEtaMinutes: estimateEtaFallback(distanceKm),
        matchSource: 'redis_geo' as const,
      }));

    return matched.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (err) {
    console.warn('[AVO Geo] Redis GEO failed, returning empty:', err);
    return [];
  }
}

/**
 * Find candidate vets for video calls.
 * No geo filter — all online vets with video enabled.
 */
export async function findVideoCandidates(
  excludeVetIds: string[] = []
): Promise<MatchedVet[]> {
  const excludeSet = new Set(excludeVetIds);

  try {
    const onlineVets = await getOnlineVideoVets();
    return onlineVets
      .filter((id) => !excludeSet.has(id))
      .map((id) => ({
        id,
        distanceKm: 0,
        estimatedEtaMinutes: 0,
        matchSource: 'redis_geo' as const,
      }));
  } catch (err) {
    console.warn('[AVO Geo] Video candidate lookup failed:', err);
    return [];
  }
}

// ─────────────────────────────────────────────
// ETA Calculation
// ─────────────────────────────────────────────

/**
 * Fallback ETA estimation (no API call).
 * Urban average speed: 25 km/h + 3 min preparation.
 */
function estimateEtaFallback(distanceKm: number): number {
  return Math.max(5, Math.round((distanceKm / 25) * 60 + 3));
}

/**
 * Real ETA using Google Routes API with live traffic.
 * Falls back to Haversine-based estimate on failure.
 */
export async function getRealEta(
  origin: GeoPoint,
  destination: GeoPoint
): Promise<{ etaMinutes: number; distanceMeters: number; source: 'google_routes' | 'fallback' }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    const dist = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      etaMinutes: estimateEtaFallback(dist),
      distanceMeters: Math.round(dist * 1000),
      source: 'fallback',
    };
  }

  try {
    const res = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: origin.lat, longitude: origin.lng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destination.lat, longitude: destination.lng },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Google Routes API responded with ${res.status}`);
    }

    const data = await res.json();
    const route = data.routes?.[0];

    if (!route) {
      throw new Error('No route found');
    }

    const durationSeconds = parseInt(route.duration.replace('s', ''), 10);
    const distanceMeters = route.distanceMeters;

    return {
      etaMinutes: Math.ceil(durationSeconds / 60),
      distanceMeters,
      source: 'google_routes',
    };
  } catch (err) {
    console.error('[AVO Geo] Google Routes API error, using fallback:', err);
    const dist = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      etaMinutes: estimateEtaFallback(dist),
      distanceMeters: Math.round(dist * 1000),
      source: 'fallback',
    };
  }
}

// ─────────────────────────────────────────────
// Legacy Compat: matchVetsByRadius (for existing API consumers)
// ─────────────────────────────────────────────

export function matchVetsByRadius(
  tutorLat: number,
  tutorLng: number,
  candidates: VetGeoCandidate[]
): VetWithEta[] {
  const matched: VetWithEta[] = [];

  for (const vet of candidates) {
    if (!vet.isOnline || vet.lat == null || vet.lng == null) continue;

    const distKm = calculateHaversineDistance(tutorLat, tutorLng, vet.lat, vet.lng);
    const maxRadius = vet.actionRadiusKm || 15;

    if (distKm <= maxRadius) {
      matched.push({
        ...vet,
        distanceKm: distKm,
        estimatedEtaMinutes: estimateEtaFallback(distKm),
        matchSource: 'bounding_box',
      });
    }
  }

  return matched.sort((a, b) => a.distanceKm - b.distanceKm);
}
