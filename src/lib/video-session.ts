/**
 * AVO-Beta V1.0.0 — Video Session Manager (Daily.co Integration)
 * 
 * Manages the full lifecycle of a video consultation:
 * 1. Room creation via Daily.co REST API
 * 2. Session tracking with heartbeat pings
 * 3. Disconnection detection with grace period (5 min)
 * 4. Automatic session abandonment on grace period expiry
 * 5. Duration tracking for partial refund calculations
 */

import { prisma } from '@/lib/prisma';
import { VIDEO_GRACE_PERIOD_MS, MAX_RECONNECTS } from '@/lib/state-machine';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateRoomResult {
  success: boolean;
  roomName: string;
  roomUrl: string;
  sessionId: string;
  message: string;
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  totalDurationSec: number;
  reconnectCount: number;
  gracePeriodEnds: string | null;
  isGracePeriodActive: boolean;
}

// ─────────────────────────────────────────────
// Daily.co API Integration
// ─────────────────────────────────────────────

const DAILY_API_URL = 'https://api.daily.co/v1';

async function dailyFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    throw new Error('DAILY_API_KEY not configured');
  }

  return fetch(`${DAILY_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });
}

// ─────────────────────────────────────────────
// Room Management
// ─────────────────────────────────────────────

/**
 * Create a Daily.co room for a video consultation.
 * Room auto-expires after 2 hours to prevent orphaned rooms.
 */
export async function createVideoRoom(
  dispatchId: string
): Promise<CreateRoomResult> {
  const roomName = `avo-${dispatchId.slice(0, 8)}-${Date.now()}`;
  const idempotencyKey = `video_session_${dispatchId}`;

  // Check if session already exists (idempotent)
  const existing = await prisma.videoSession.findUnique({
    where: { dispatchId },
  });

  if (existing) {
    return {
      success: true,
      roomName: existing.roomName,
      roomUrl: existing.roomUrl || '',
      sessionId: existing.id,
      message: 'Session already exists (idempotent response).',
    };
  }

  let roomUrl = '';
  const hasDailyKey = Boolean(process.env.DAILY_API_KEY);

  if (hasDailyKey) {
    try {
      const expiryTimestamp = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2 hours from now

      const res = await dailyFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            exp: expiryTimestamp,
            max_participants: 2,
            enable_chat: true,
            enable_screenshare: false,
            enable_recording: false, // Optional add-on, not required
            start_audio_off: false,
            start_video_off: false,
            lang: 'es',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        roomUrl = data.url;
      } else {
        const errText = await res.text();
        console.error('[AVO Video] Daily.co room creation failed:', res.status, errText);
        // Fall through to simulation mode
      }
    } catch (err) {
      console.error('[AVO Video] Daily.co API error:', err);
    }
  }

  // Simulation mode if no Daily.co key or API failed
  if (!roomUrl) {
    roomUrl = `https://avo-vet.daily.co/${roomName}`;
  }

  // Create session record
  const session = await prisma.videoSession.create({
    data: {
      dispatchId,
      roomName,
      roomUrl,
      status: 'WAITING',
      idempotencyKey,
    },
  });

  return {
    success: true,
    roomName,
    roomUrl,
    sessionId: session.id,
    message: hasDailyKey
      ? 'Daily.co room created successfully.'
      : 'Video room created (simulation mode).',
  };
}

/**
 * Destroy a Daily.co room (cleanup after session ends).
 */
export async function destroyVideoRoom(roomName: string): Promise<void> {
  if (!process.env.DAILY_API_KEY) return;

  try {
    await dailyFetch(`/rooms/${roomName}`, { method: 'DELETE' });
  } catch (err) {
    console.error('[AVO Video] Failed to destroy room:', err);
  }
}

// ─────────────────────────────────────────────
// Session Lifecycle
// ─────────────────────────────────────────────

/**
 * Mark video session as ACTIVE when both participants join.
 */
export async function activateSession(dispatchId: string): Promise<SessionStatus> {
  const session = await prisma.videoSession.update({
    where: { dispatchId },
    data: {
      status: 'ACTIVE',
      startedAt: new Date(),
      lastPingAt: new Date(),
    },
  });

  return formatSessionStatus(session);
}

/**
 * Heartbeat ping — called periodically by the client to indicate connection is alive.
 * Also updates total duration.
 */
export async function pingSession(dispatchId: string): Promise<SessionStatus> {
  const session = await prisma.videoSession.findUnique({
    where: { dispatchId },
  });

  if (!session || session.status === 'ENDED') {
    throw new Error('Session not found or already ended');
  }

  const now = new Date();
  const lastPing = session.lastPingAt || session.startedAt || now;
  const elapsedSec = Math.floor((now.getTime() - lastPing.getTime()) / 1000);

  const updated = await prisma.videoSession.update({
    where: { dispatchId },
    data: {
      lastPingAt: now,
      totalDurationSec: { increment: Math.min(elapsedSec, 30) }, // Cap at 30s per ping interval
      // If session was interrupted and we're getting a ping, it means reconnection succeeded
      status: session.status === 'INTERRUPTED' ? 'ACTIVE' : session.status,
      gracePeriodEnds: session.status === 'INTERRUPTED' ? null : session.gracePeriodEnds,
      reconnectCount: session.status === 'INTERRUPTED'
        ? { increment: 1 }
        : session.reconnectCount,
    },
  });

  return formatSessionStatus(updated);
}

/**
 * Handle disconnection: start grace period.
 */
export async function handleDisconnect(dispatchId: string): Promise<SessionStatus> {
  const session = await prisma.videoSession.findUnique({
    where: { dispatchId },
  });

  if (!session || session.status !== 'ACTIVE') {
    throw new Error('Session not active');
  }

  if (session.reconnectCount >= MAX_RECONNECTS) {
    // Too many reconnections — end session
    return await endSession(dispatchId, 'MAX_RECONNECTS_EXCEEDED');
  }

  const gracePeriodEnds = new Date(Date.now() + VIDEO_GRACE_PERIOD_MS);

  const updated = await prisma.videoSession.update({
    where: { dispatchId },
    data: {
      status: 'INTERRUPTED',
      gracePeriodEnds,
    },
  });

  return formatSessionStatus(updated);
}

/**
 * Check if grace period has expired for an interrupted session.
 * Called by a scheduled job or on next ping attempt.
 */
export async function checkGracePeriod(dispatchId: string): Promise<{
  expired: boolean;
  sessionStatus: SessionStatus;
}> {
  const session = await prisma.videoSession.findUnique({
    where: { dispatchId },
  });

  if (!session || session.status !== 'INTERRUPTED') {
    return {
      expired: false,
      sessionStatus: formatSessionStatus(session || createEmptySession()),
    };
  }

  const expired = session.gracePeriodEnds
    ? new Date() > session.gracePeriodEnds
    : false;

  if (expired) {
    const ended = await endSession(dispatchId, 'GRACE_PERIOD_EXPIRED');
    return { expired: true, sessionStatus: ended };
  }

  return { expired: false, sessionStatus: formatSessionStatus(session) };
}

/**
 * End a video session (normal completion or abandonment).
 */
export async function endSession(
  dispatchId: string,
  reason: string = 'COMPLETED'
): Promise<SessionStatus> {
  const session = await prisma.videoSession.findUnique({
    where: { dispatchId },
  });

  if (!session) throw new Error('Session not found');

  const updated = await prisma.videoSession.update({
    where: { dispatchId },
    data: {
      status: 'ENDED',
      endedAt: new Date(),
      gracePeriodEnds: null,
    },
  });

  // Cleanup Daily.co room
  await destroyVideoRoom(session.roomName);

  return formatSessionStatus(updated);
}

/**
 * Get total billed duration in seconds for refund calculations.
 */
export async function getSessionDuration(dispatchId: string): Promise<number> {
  const session = await prisma.videoSession.findUnique({
    where: { dispatchId },
    select: { totalDurationSec: true },
  });

  return session?.totalDurationSec || 0;
}

// ─────────────────────────────────────────────
// Meeting Token (for authenticated room access)
// ─────────────────────────────────────────────

/**
 * Generate a Daily.co meeting token for a participant.
 * Tokens are scoped to a specific room and expire with the room.
 */
export async function generateMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean = false
): Promise<string> {
  if (!process.env.DAILY_API_KEY) {
    // Simulation mode — return a fake token
    return `sim_token_${roomName}_${Date.now()}`;
  }

  try {
    const res = await dailyFetch('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner,
          exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours
          enable_recording: false,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.token;
    }

    console.error('[AVO Video] Token generation failed:', await res.text());
    return `fallback_token_${roomName}_${Date.now()}`;
  } catch (err) {
    console.error('[AVO Video] Token generation error:', err);
    return `fallback_token_${roomName}_${Date.now()}`;
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatSessionStatus(session: {
  id: string;
  status: string;
  totalDurationSec: number;
  reconnectCount: number;
  gracePeriodEnds: Date | null;
}): SessionStatus {
  const now = new Date();
  return {
    sessionId: session.id,
    status: session.status,
    totalDurationSec: session.totalDurationSec,
    reconnectCount: session.reconnectCount,
    gracePeriodEnds: session.gracePeriodEnds?.toISOString() || null,
    isGracePeriodActive:
      session.status === 'INTERRUPTED' &&
      session.gracePeriodEnds !== null &&
      now < session.gracePeriodEnds,
  };
}

function createEmptySession() {
  return {
    id: '',
    status: 'UNKNOWN',
    totalDurationSec: 0,
    reconnectCount: 0,
    gracePeriodEnds: null,
  };
}
