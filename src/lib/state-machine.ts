/**
 * AVO-Beta V1.0.0 — Finite State Machine for Dispatch Lifecycle
 * 
 * Typed FSM with validated transitions, guard conditions, and side-effect hooks.
 * Every state transition is audited via DispatchEvent.
 */

// ─────────────────────────────────────────────
// States
// ─────────────────────────────────────────────

export const DISPATCH_STATES = {
  TRIAGE_STARTED: 'TRIAGE_STARTED',
  PET_DATA_LOADED: 'PET_DATA_LOADED',
  PAYMENT_PREAUTH: 'PAYMENT_PREAUTH',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  AWAITING_MATCH: 'AWAITING_MATCH',
  CLAIMED: 'CLAIMED',
  EN_ROUTE: 'EN_ROUTE',
  ARRIVED: 'ARRIVED',
  SESSION_ACTIVE: 'SESSION_ACTIVE',
  SESSION_INTERRUPTED: 'SESSION_INTERRUPTED',
  SESSION_ABANDONED: 'SESSION_ABANDONED',
  COMPLETING: 'COMPLETING',
  COMPLETED: 'COMPLETED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  CANCELLED_BY_TUTOR: 'CANCELLED_BY_TUTOR',
  CANCELLED_BY_VET: 'CANCELLED_BY_VET',
  EXPIRED_NO_MATCH: 'EXPIRED_NO_MATCH',
  REFUNDED: 'REFUNDED',
} as const;

export type DispatchState = typeof DISPATCH_STATES[keyof typeof DISPATCH_STATES];

// ─────────────────────────────────────────────
// Events (triggers for transitions)
// ─────────────────────────────────────────────

export const DISPATCH_EVENTS = {
  PET_DATA_SUBMITTED: 'PET_DATA_SUBMITTED',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_AUTH_FAILED: 'PAYMENT_AUTH_FAILED',
  MATCH_STARTED: 'MATCH_STARTED',
  VET_CLAIMED: 'VET_CLAIMED',
  VET_DEPARTED: 'VET_DEPARTED',
  VET_ARRIVED: 'VET_ARRIVED',
  SESSION_STARTED: 'SESSION_STARTED',
  CONNECTION_LOST: 'CONNECTION_LOST',
  CONNECTION_RESTORED: 'CONNECTION_RESTORED',
  GRACE_PERIOD_EXPIRED: 'GRACE_PERIOD_EXPIRED',
  HC_SUBMITTED: 'HC_SUBMITTED',
  HC_SIGNED: 'HC_SIGNED',
  PAYMENT_CAPTURED_OK: 'PAYMENT_CAPTURED_OK',
  TUTOR_CANCELLED: 'TUTOR_CANCELLED',
  VET_CANCELLED: 'VET_CANCELLED',
  MATCH_TIMEOUT: 'MATCH_TIMEOUT',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
  TIER_EXPANDED: 'TIER_EXPANDED',
} as const;

export type DispatchEvent = typeof DISPATCH_EVENTS[keyof typeof DISPATCH_EVENTS];

// ─────────────────────────────────────────────
// Transition Definition
// ─────────────────────────────────────────────

interface TransitionDef {
  from: DispatchState;
  event: DispatchEvent;
  to: DispatchState;
  guard?: (context: TransitionContext) => boolean;
}

export interface TransitionContext {
  dispatchId: string;
  actorId?: string;
  serviceType?: 'video' | 'domicilio';
  currentTier?: number;
  claimedAt?: Date;
  gracePeriodEnds?: Date;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: boolean;
  from: DispatchState;
  to: DispatchState;
  event: DispatchEvent;
  reason?: string;
}

// ─────────────────────────────────────────────
// Transition Table (Legal Transitions)
// ─────────────────────────────────────────────

const TRANSITION_TABLE: TransitionDef[] = [
  // Triage flow
  { from: 'TRIAGE_STARTED', event: 'PET_DATA_SUBMITTED', to: 'PET_DATA_LOADED' },
  { from: 'PET_DATA_LOADED', event: 'PAYMENT_AUTHORIZED', to: 'PAYMENT_PREAUTH' },
  { from: 'PET_DATA_LOADED', event: 'PAYMENT_AUTH_FAILED', to: 'PAYMENT_FAILED' },
  { from: 'PAYMENT_PREAUTH', event: 'MATCH_STARTED', to: 'AWAITING_MATCH' },

  // Matching
  { from: 'AWAITING_MATCH', event: 'VET_CLAIMED', to: 'CLAIMED' },
  { from: 'AWAITING_MATCH', event: 'TIER_EXPANDED', to: 'AWAITING_MATCH' }, // Self-transition: expand radius
  { from: 'AWAITING_MATCH', event: 'MATCH_TIMEOUT', to: 'EXPIRED_NO_MATCH' },
  { from: 'AWAITING_MATCH', event: 'TUTOR_CANCELLED', to: 'CANCELLED_BY_TUTOR' },

  // Domicilio flow: CLAIMED → EN_ROUTE → ARRIVED → SESSION_ACTIVE
  {
    from: 'CLAIMED', event: 'VET_DEPARTED', to: 'EN_ROUTE',
    guard: (ctx) => ctx.serviceType === 'domicilio',
  },
  { from: 'EN_ROUTE', event: 'VET_ARRIVED', to: 'ARRIVED' },
  { from: 'ARRIVED', event: 'SESSION_STARTED', to: 'SESSION_ACTIVE' },

  // Video flow: CLAIMED → SESSION_ACTIVE (direct)
  {
    from: 'CLAIMED', event: 'SESSION_STARTED', to: 'SESSION_ACTIVE',
    guard: (ctx) => ctx.serviceType === 'video',
  },

  // Vet cancels post-claim (re-enqueue)
  {
    from: 'CLAIMED', event: 'VET_CANCELLED', to: 'AWAITING_MATCH',
    guard: (ctx) => {
      if (!ctx.claimedAt) return true;
      const elapsed = Date.now() - ctx.claimedAt.getTime();
      return elapsed < 2 * 60 * 1000; // Only within 2 minutes of claim
    },
  },

  // Video interruption & recovery
  {
    from: 'SESSION_ACTIVE', event: 'CONNECTION_LOST', to: 'SESSION_INTERRUPTED',
    guard: (ctx) => ctx.serviceType === 'video',
  },
  { from: 'SESSION_INTERRUPTED', event: 'CONNECTION_RESTORED', to: 'SESSION_ACTIVE' },
  { from: 'SESSION_INTERRUPTED', event: 'GRACE_PERIOD_EXPIRED', to: 'SESSION_ABANDONED' },

  // Completion flow
  { from: 'SESSION_ACTIVE', event: 'HC_SUBMITTED', to: 'COMPLETING' },
  { from: 'COMPLETING', event: 'HC_SIGNED', to: 'COMPLETED' },
  { from: 'COMPLETED', event: 'PAYMENT_CAPTURED_OK', to: 'PAYMENT_CAPTURED' },

  // Cancellations
  { from: 'CLAIMED', event: 'TUTOR_CANCELLED', to: 'CANCELLED_BY_TUTOR' },
  { from: 'EN_ROUTE', event: 'TUTOR_CANCELLED', to: 'CANCELLED_BY_TUTOR' },
  { from: 'EN_ROUTE', event: 'VET_CANCELLED', to: 'CANCELLED_BY_VET' },

  // Refunds
  { from: 'EXPIRED_NO_MATCH', event: 'REFUND_COMPLETED', to: 'REFUNDED' },
  { from: 'CANCELLED_BY_TUTOR', event: 'REFUND_COMPLETED', to: 'REFUNDED' },
  { from: 'CANCELLED_BY_VET', event: 'REFUND_COMPLETED', to: 'REFUNDED' },
  { from: 'SESSION_ABANDONED', event: 'REFUND_COMPLETED', to: 'REFUNDED' },
  { from: 'PAYMENT_FAILED', event: 'REFUND_COMPLETED', to: 'REFUNDED' },
];

// ─────────────────────────────────────────────
// FSM Engine
// ─────────────────────────────────────────────

/**
 * Validates whether a transition is legal given the current state and event.
 * Returns the target state if valid, null otherwise.
 */
export function resolveTransition(
  currentState: DispatchState,
  event: DispatchEvent,
  context: TransitionContext
): TransitionResult {
  const candidates = TRANSITION_TABLE.filter(
    (t) => t.from === currentState && t.event === event
  );

  if (candidates.length === 0) {
    return {
      success: false,
      from: currentState,
      to: currentState,
      event,
      reason: `No transition defined for state="${currentState}" + event="${event}"`,
    };
  }

  // Evaluate guards — first match wins (priority by order)
  for (const candidate of candidates) {
    if (!candidate.guard || candidate.guard(context)) {
      return {
        success: true,
        from: currentState,
        to: candidate.to,
        event,
      };
    }
  }

  return {
    success: false,
    from: currentState,
    to: currentState,
    event,
    reason: `All guard conditions failed for state="${currentState}" + event="${event}"`,
  };
}

/**
 * Returns all legal events from the given state.
 */
export function getAvailableEvents(currentState: DispatchState): DispatchEvent[] {
  return [...new Set(
    TRANSITION_TABLE
      .filter((t) => t.from === currentState)
      .map((t) => t.event)
  )];
}

/**
 * Returns true if the state is a terminal state (no further transitions possible).
 */
export function isTerminalState(state: DispatchState): boolean {
  return ['PAYMENT_CAPTURED', 'REFUNDED', 'PAYMENT_FAILED'].includes(state);
}

/**
 * Returns true if the state allows cancellation by the tutor.
 */
export function isCancellableByTutor(state: DispatchState): boolean {
  return ['AWAITING_MATCH', 'CLAIMED', 'EN_ROUTE'].includes(state);
}

/**
 * Returns true if the dispatch is in an active service state.
 */
export function isActiveService(state: DispatchState): boolean {
  return ['SESSION_ACTIVE', 'SESSION_INTERRUPTED', 'COMPLETING'].includes(state);
}

// ─────────────────────────────────────────────
// Tier Configuration (Domicilio Matching)
// ─────────────────────────────────────────────

export interface TierConfig {
  tier: number;
  radiusKm: number;
  timeoutSeconds: number;
}

export const MATCHING_TIERS: TierConfig[] = [
  { tier: 1, radiusKm: 5, timeoutSeconds: 60 },
  { tier: 2, radiusKm: 10, timeoutSeconds: 60 },
  { tier: 3, radiusKm: 20, timeoutSeconds: 90 },
];

export const VIDEO_MATCH_TIMEOUT_SECONDS = 90;
export const TOTAL_MATCH_TIMEOUT_SECONDS = MATCHING_TIERS.reduce((sum, t) => sum + t.timeoutSeconds, 0); // 210s
export const VET_CANCEL_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
export const VIDEO_GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_RECONNECTS = 3;
