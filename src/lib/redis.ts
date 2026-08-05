/**
 * AVO-Beta V1.0.0 — Redis Client Singleton
 * 
 * Provides a shared Redis connection for:
 * - GEO index (vet locations)
 * - H3 cell membership (vet-to-hexagon mapping)
 * - Session caching
 * - Pub/Sub notifications
 */

import Redis from 'ioredis';

// Keys namespace
export const REDIS_KEYS = {
  /** Redis GEO sorted set: all online vets with coordinates */
  VETS_GEO: 'avo:vets:geo',
  /** H3 cell membership: SET of vetIds per H3 index */
  h3Cell: (h3Index: string) => `avo:h3:${h3Index}`,
  /** Online vet set (for video matching — no geo filter) */
  VETS_ONLINE_VIDEO: 'avo:vets:online:video',
  /** Dispatch lock: prevents double claim */
  dispatchLock: (dispatchId: string) => `avo:dispatch:lock:${dispatchId}`,
  /** Tier timer: tracks which tier a dispatch is currently in */
  dispatchTier: (dispatchId: string) => `avo:dispatch:tier:${dispatchId}`,
  /** Video session ping */
  sessionPing: (sessionId: string) => `avo:session:ping:${sessionId}`,
} as const;

// ─────────────────────────────────────────────
// Singleton Connection
// ─────────────────────────────────────────────

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) return null; // Stop retrying after 10 attempts
        return Math.min(times * 200, 5000); // Exponential backoff, max 5s
      },
      lazyConnect: true,
      enableReadyCheck: true,
      connectTimeout: 10000,
    });

    redis.on('error', (err) => {
      console.error('[AVO Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[AVO Redis] Connected successfully');
    });

    redis.on('ready', () => {
      console.log('[AVO Redis] Ready to accept commands');
    });
  }

  return redis;
}

/**
 * Gracefully disconnect Redis (for cleanup/shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// ─────────────────────────────────────────────
// GEO Operations (Vet Location Management)
// ─────────────────────────────────────────────

/**
 * Register a vet's location in the Redis GEO index.
 * Called when a vet goes online or updates their position.
 */
export async function registerVetLocation(
  vetId: string,
  lng: number,
  lat: number,
  acceptsVideo: boolean = true
): Promise<void> {
  const client = getRedisClient();
  const pipeline = client.pipeline();

  // Add to GEO sorted set
  pipeline.geoadd(REDIS_KEYS.VETS_GEO, lng, lat, vetId);

  // Also track video availability
  if (acceptsVideo) {
    pipeline.sadd(REDIS_KEYS.VETS_ONLINE_VIDEO, vetId);
  }

  await pipeline.exec();
}

/**
 * Register a vet in their H3 cell for hexagonal grid lookup.
 */
export async function registerVetH3(vetId: string, h3Index: string): Promise<void> {
  const client = getRedisClient();
  await client.sadd(REDIS_KEYS.h3Cell(h3Index), vetId);
}

/**
 * Remove a vet from all location indexes.
 * Called when a vet goes offline.
 */
export async function unregisterVetLocation(
  vetId: string,
  h3Index?: string
): Promise<void> {
  const client = getRedisClient();
  const pipeline = client.pipeline();

  pipeline.zrem(REDIS_KEYS.VETS_GEO, vetId);
  pipeline.srem(REDIS_KEYS.VETS_ONLINE_VIDEO, vetId);

  if (h3Index) {
    pipeline.srem(REDIS_KEYS.h3Cell(h3Index), vetId);
  }

  await pipeline.exec();
}

/**
 * Find vets within a given radius using Redis GEOSEARCH.
 * Returns vetIds sorted by distance (closest first).
 */
export async function findVetsInRadius(
  lng: number,
  lat: number,
  radiusKm: number,
  count: number = 20
): Promise<Array<{ vetId: string; distanceKm: number }>> {
  const client = getRedisClient();

  const results = await client.geosearch(
    REDIS_KEYS.VETS_GEO,
    'FROMLONLAT', lng, lat,
    'BYRADIUS', radiusKm, 'km',
    'ASC',
    'COUNT', count,
    'WITHDIST'
  ) as Array<[string, string]>;

  return results.map(([vetId, dist]) => ({
    vetId,
    distanceKm: parseFloat(dist),
  }));
}

/**
 * Get all online vets available for video (no geo filter).
 */
export async function getOnlineVideoVets(): Promise<string[]> {
  const client = getRedisClient();
  return client.smembers(REDIS_KEYS.VETS_ONLINE_VIDEO);
}

/**
 * Get all vets in a set of H3 cells.
 */
export async function getVetsInH3Cells(h3Indexes: string[]): Promise<string[]> {
  const client = getRedisClient();
  if (h3Indexes.length === 0) return [];

  const pipeline = client.pipeline();
  for (const h3 of h3Indexes) {
    pipeline.smembers(REDIS_KEYS.h3Cell(h3));
  }

  const results = await pipeline.exec();
  if (!results) return [];

  const vetIds = new Set<string>();
  for (const [err, members] of results) {
    if (!err && Array.isArray(members)) {
      for (const id of members) {
        vetIds.add(id as string);
      }
    }
  }

  return [...vetIds];
}
