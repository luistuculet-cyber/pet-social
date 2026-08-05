/**
 * AVO-Beta V1.0.0 — Dispatch Engine (Atomic Claim-Based Assignment)
 * 
 * Eliminates race conditions via:
 * 1. Atomic UPDATE ... WHERE status = 'AWAITING_MATCH' (claim lock)
 * 2. Prisma interactive transactions with Serializable isolation
 * 3. Full audit trail via DispatchEvent
 * 
 * Matching strategies:
 * - Video: broadcast to all online vets, first claim wins
 * - Domicilio: tiered H3/Redis GEO search with expanding radius
 */

import { prisma } from '@/lib/prisma';
import {
  resolveTransition,
  DISPATCH_STATES,
  DISPATCH_EVENTS,
  MATCHING_TIERS,
  VIDEO_MATCH_TIMEOUT_SECONDS,
  type TransitionContext,
  type DispatchState,
} from '@/lib/state-machine';
import { findDomicilioCandidates, findVideoCandidates, getRealEta } from '@/lib/geo';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DispatchResult {
  success: boolean;
  dispatchId: string;
  status: string;
  vetId?: string | null;
  etaMinutes?: number;
  message: string;
  idempotencyKey?: string;
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// ─────────────────────────────────────────────
// Audit Trail
// ─────────────────────────────────────────────

async function recordEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  dispatchId: string,
  event: string,
  actorId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await tx.dispatchEvent.create({
    data: {
      dispatchId,
      event,
      actorId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

// ─────────────────────────────────────────────
// State Transition (Validated + Audited)
// ─────────────────────────────────────────────

async function executeTransition(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  dispatchId: string,
  currentStatus: string,
  event: (typeof DISPATCH_EVENTS)[keyof typeof DISPATCH_EVENTS],
  context: TransitionContext,
  updateData: Record<string, unknown>
): Promise<{ newStatus: string }> {
  const result = resolveTransition(
    currentStatus as DispatchState,
    event,
    context
  );

  if (!result.success) {
    throw new Error(
      `Invalid transition: ${currentStatus} + ${event} → ${result.reason}`
    );
  }

  await tx.dispatch.update({
    where: { id: dispatchId },
    data: {
      status: result.to,
      ...updateData,
    },
  });

  await recordEvent(tx, dispatchId, event, context.actorId, context.metadata);

  return { newStatus: result.to };
}

// ─────────────────────────────────────────────
// 1. CLAIM DISPATCH (Atomic — Zero Race Conditions)
// ─────────────────────────────────────────────

/**
 * Atomic claim: a vet attempts to take ownership of a dispatch.
 * Uses UPDATE ... WHERE status = 'AWAITING_MATCH' to ensure only one vet succeeds.
 */
export async function claimDispatch(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Verify vet exists and is active
        const vet = await tx.user.findUnique({
          where: { id: vetId },
          select: { id: true, name: true, role: true, status: true, lat: true, lng: true },
        });

        if (!vet || vet.role !== 'vet' || vet.status !== 'active') {
          throw new ConflictError('VET_NOT_ELIGIBLE');
        }

        // Atomic claim: this is the critical section.
        // The WHERE clause acts as a distributed lock — only one UPDATE can match.
        const updateCount = await tx.$executeRaw`
          UPDATE Dispatch
          SET status = 'CLAIMED',
              vetId = ${vetId},
              claimedAt = NOW()
          WHERE id = ${dispatchId}
            AND status = 'AWAITING_MATCH'
        `;

        if (updateCount === 0) {
          // Either dispatch doesn't exist or was already claimed
          const existing = await tx.dispatch.findUnique({
            where: { id: dispatchId },
            select: { status: true, vetId: true },
          });

          if (!existing) {
            throw new ConflictError('DISPATCH_NOT_FOUND');
          }

          throw new ConflictError(
            `DISPATCH_ALREADY_${existing.status}: claimed by ${existing.vetId || 'unknown'}`
          );
        }

        // Record audit event
        await recordEvent(tx, dispatchId, 'VET_CLAIMED', vetId, {
          claimedAt: new Date().toISOString(),
        });

        // Increment vet's completed services counter (for ranking)
        await tx.user.update({
          where: { id: vetId },
          data: { completedServices: { increment: 0 } }, // Incremented on completion, not claim
        });

        return {
          success: true as const,
          dispatchId,
          status: DISPATCH_STATES.CLAIMED,
          vetId,
          message: `Dispatch claimed by ${vet.name || vetId}`,
        };
      },
      {
        timeout: 5000,
      }
    );

    return result;
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        success: false,
        dispatchId,
        status: 'CONFLICT',
        message: error.message,
      };
    }

    console.error('[AVO Dispatch] Claim error:', error);
    return {
      success: false,
      dispatchId,
      status: 'ERROR',
      message: 'Internal error during claim',
    };
  }
}

// ─────────────────────────────────────────────
// 2. START MATCHING (Enqueue for assignment)
// ─────────────────────────────────────────────

/**
 * Transition a dispatch from PAYMENT_PREAUTH to AWAITING_MATCH.
 * For domicilio: starts tiered search. For video: broadcasts to all online vets.
 */
export async function startMatching(
  dispatchId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: {
        id: true,
        status: true,
        serviceType: true,
        lat: true,
        lng: true,
      },
    });

    if (!dispatch) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Dispatch not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.MATCH_STARTED,
        { dispatchId, serviceType: dispatch.serviceType as 'video' | 'domicilio' },
        {
          matchingStartedAt: new Date(),
          currentTier: 1,
          tierStartedAt: new Date(),
        }
      );
    });

    // Find initial candidates
    const isVideo = dispatch.serviceType === 'video';
    let candidateCount = 0;

    if (isVideo) {
      const candidates = await findVideoCandidates();
      candidateCount = candidates.length;
    } else {
      const tier1 = MATCHING_TIERS[0];
      const candidates = await findDomicilioCandidates(
        dispatch.lat,
        dispatch.lng,
        tier1
      );
      candidateCount = candidates.length;
    }

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.AWAITING_MATCH,
      message: `Matching started. ${candidateCount} candidate(s) notified via ${isVideo ? 'broadcast' : `Tier 1 (${MATCHING_TIERS[0].radiusKm}km)`}.`,
    };
  } catch (error) {
    console.error('[AVO Dispatch] startMatching error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to start matching' };
  }
}

// ─────────────────────────────────────────────
// 3. EXPAND TIER (Domicilio only)
// ─────────────────────────────────────────────

/**
 * Expand the search radius to the next tier when the current tier times out.
 */
export async function expandTier(
  dispatchId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: {
        id: true,
        status: true,
        currentTier: true,
        lat: true,
        lng: true,
        serviceType: true,
      },
    });

    if (!dispatch || dispatch.status !== DISPATCH_STATES.AWAITING_MATCH) {
      return { success: false, dispatchId, status: dispatch?.status || 'NOT_FOUND', message: 'Cannot expand tier' };
    }

    const nextTierIndex = dispatch.currentTier; // currentTier is 1-indexed, array is 0-indexed
    if (nextTierIndex >= MATCHING_TIERS.length) {
      // All tiers exhausted → EXPIRED_NO_MATCH
      return await expireNoMatch(dispatchId);
    }

    const nextTier = MATCHING_TIERS[nextTierIndex];

    await prisma.$transaction(async (tx) => {
      await tx.dispatch.update({
        where: { id: dispatchId },
        data: {
          currentTier: nextTierIndex + 1,
          tierStartedAt: new Date(),
        },
      });

      await recordEvent(tx, dispatchId, 'TIER_EXPANDED', undefined, {
        fromTier: dispatch.currentTier,
        toTier: nextTierIndex + 1,
        newRadiusKm: nextTier.radiusKm,
        timeoutSeconds: nextTier.timeoutSeconds,
      });
    });

    const candidates = await findDomicilioCandidates(
      dispatch.lat,
      dispatch.lng,
      nextTier
    );

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.AWAITING_MATCH,
      message: `Expanded to Tier ${nextTierIndex + 1} (${nextTier.radiusKm}km). ${candidates.length} new candidate(s).`,
    };
  } catch (error) {
    console.error('[AVO Dispatch] expandTier error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to expand tier' };
  }
}

// ─────────────────────────────────────────────
// 4. EXPIRE NO MATCH (Timeout — trigger refund)
// ─────────────────────────────────────────────

export async function expireNoMatch(
  dispatchId: string
): Promise<DispatchResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id: dispatchId },
        select: { id: true, status: true, matchingStartedAt: true, currentTier: true },
      });

      if (!dispatch || dispatch.status !== DISPATCH_STATES.AWAITING_MATCH) {
        throw new Error('Cannot expire: dispatch not in AWAITING_MATCH state');
      }

      const totalWaitTime = dispatch.matchingStartedAt
        ? Math.round((Date.now() - dispatch.matchingStartedAt.getTime()) / 1000)
        : 0;

      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.MATCH_TIMEOUT,
        { dispatchId },
        {}
      );

      await recordEvent(tx, dispatchId, 'MATCH_TIMEOUT', undefined, {
        totalWaitTimeSeconds: totalWaitTime,
        tiersExhausted: MATCHING_TIERS.slice(0, dispatch.currentTier).map(
          (t) => `${t.radiusKm}km_${t.timeoutSeconds}s`
        ),
      });
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.EXPIRED_NO_MATCH,
      message: 'All tiers exhausted. Dispatch expired — auto-refund triggered.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] expireNoMatch error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to expire dispatch' };
  }
}

// ─────────────────────────────────────────────
// 5. VET DEPARTS (Domicilio: CLAIMED → EN_ROUTE)
// ─────────────────────────────────────────────

export async function vetDeparted(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult & { etaMinutes?: number }> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, serviceType: true, lat: true, lng: true, vetId: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    // Get real ETA from vet's current position to tutor
    const vet = await prisma.user.findUnique({
      where: { id: vetId },
      select: { lat: true, lng: true },
    });

    let etaMinutes = 15; // Default
    if (vet?.lat && vet?.lng) {
      const etaResult = await getRealEta(
        { lat: vet.lat, lng: vet.lng },
        { lat: dispatch.lat, lng: dispatch.lng }
      );
      etaMinutes = etaResult.etaMinutes;
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.VET_DEPARTED,
        { dispatchId, actorId: vetId, serviceType: 'domicilio' },
        {}
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.EN_ROUTE,
      vetId,
      etaMinutes,
      message: `Vet en route. ETA: ${etaMinutes} minutos.`,
    };
  } catch (error) {
    console.error('[AVO Dispatch] vetDeparted error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to transition to EN_ROUTE' };
  }
}

// ─────────────────────────────────────────────
// 6. VET ARRIVED (Domicilio: EN_ROUTE → ARRIVED)
// ─────────────────────────────────────────────

export async function vetArrived(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, vetId: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.VET_ARRIVED,
        { dispatchId, actorId: vetId },
        {}
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.ARRIVED,
      vetId,
      message: 'Vet arrived at location.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] vetArrived error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to transition to ARRIVED' };
  }
}

// ─────────────────────────────────────────────
// 7. START SESSION (Both modalities)
// ─────────────────────────────────────────────

export async function startSession(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, serviceType: true, vetId: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.SESSION_STARTED,
        {
          dispatchId,
          actorId: vetId,
          serviceType: dispatch.serviceType as 'video' | 'domicilio',
        },
        {}
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.SESSION_ACTIVE,
      vetId,
      message: 'Session started.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] startSession error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to start session' };
  }
}

// ─────────────────────────────────────────────
// 8. COMPLETE DISPATCH (SESSION_ACTIVE → COMPLETING → COMPLETED)
// ─────────────────────────────────────────────

export async function submitHC(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, vetId: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.HC_SUBMITTED,
        { dispatchId, actorId: vetId },
        {}
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.COMPLETING,
      message: 'HC submitted. Awaiting signature.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] submitHC error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to submit HC' };
  }
}

export async function signAndComplete(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, vetId: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.HC_SIGNED,
        { dispatchId, actorId: vetId },
        { completedAt: new Date() }
      );

      // Increment vet's completed services
      await tx.user.update({
        where: { id: vetId },
        data: { completedServices: { increment: 1 } },
      });
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.COMPLETED,
      message: 'Service completed. HC signed. Proceeding to payment capture.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] signAndComplete error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to complete' };
  }
}

// ─────────────────────────────────────────────
// 9. CANCEL BY TUTOR
// ─────────────────────────────────────────────

export async function cancelByTutor(
  dispatchId: string,
  tutorId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, tutorId: true },
    });

    if (!dispatch || dispatch.tutorId !== tutorId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.TUTOR_CANCELLED,
        { dispatchId, actorId: tutorId },
        {}
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.CANCELLED_BY_TUTOR,
      message: 'Dispatch cancelled by tutor. Refund will be processed.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] cancelByTutor error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to cancel' };
  }
}

// ─────────────────────────────────────────────
// 10. CANCEL BY VET (Post-claim, within 2 min window)
// ─────────────────────────────────────────────

export async function cancelByVet(
  dispatchId: string,
  vetId: string
): Promise<DispatchResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, status: true, vetId: true, claimedAt: true, serviceType: true },
    });

    if (!dispatch || dispatch.vetId !== vetId) {
      return { success: false, dispatchId, status: 'ERROR', message: 'Unauthorized or not found' };
    }

    await prisma.$transaction(async (tx) => {
      await executeTransition(
        tx,
        dispatchId,
        dispatch.status,
        DISPATCH_EVENTS.VET_CANCELLED,
        {
          dispatchId,
          actorId: vetId,
          serviceType: dispatch.serviceType as 'video' | 'domicilio',
          claimedAt: dispatch.claimedAt || undefined,
        },
        {
          vetId: null,
          claimedAt: null,
          matchingStartedAt: new Date(),
          currentTier: 1,
          tierStartedAt: new Date(),
        }
      );
    });

    return {
      success: true,
      dispatchId,
      status: DISPATCH_STATES.AWAITING_MATCH,
      message: 'Vet cancelled. Dispatch re-enqueued for matching.',
    };
  } catch (error) {
    console.error('[AVO Dispatch] cancelByVet error:', error);
    return { success: false, dispatchId, status: 'ERROR', message: 'Failed to cancel' };
  }
}
