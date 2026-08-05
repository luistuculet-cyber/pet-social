/**
 * AVO-Beta V1.0.0 — MercadoPago Webhook Handler (Idempotent)
 * 
 * Implements the Transactional Inbox Pattern:
 * 1. Record webhook event BEFORE processing (prevents loss)
 * 2. Idempotency check BEFORE processing (prevents duplicates)
 * 3. Process payment state change
 * 4. Mark event as COMPLETED
 * 
 * MercadoPago sends POST notifications to this endpoint for:
 * - payment.created
 * - payment.updated (includes approvals, rejections, refunds)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseEscrowPayment, captureEscrowPayment } from '@/lib/payment-gateways';

// ─────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const webhookId = String(body.id || '');
  const action = String(body.action || '');
  const dataId = String((body.data as Record<string, unknown>)?.id || '');
  const type = String(body.type || '');

  if (!webhookId || !dataId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const idempotencyKey = `mp_webhook_${webhookId}_${dataId}`;

  // ── Step 1: Idempotency Check ──
  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
  });

  if (existing) {
    // Already processed — return 200 to prevent MercadoPago retries
    return NextResponse.json({
      status: 'already_processed',
      processedAt: existing.processedAt?.toISOString(),
    });
  }

  // ── Step 2: Record event BEFORE processing (Inbox Pattern) ──
  await prisma.webhookEvent.create({
    data: {
      idempotencyKey,
      source: 'mercadopago',
      eventType: action || type,
      payload: JSON.stringify(body),
      status: 'PROCESSING',
    },
  });

  try {
    // ── Step 3: Fetch payment details from MercadoPago ──
    const paymentDetails = await fetchMercadoPagoPayment(dataId);

    if (!paymentDetails) {
      await markWebhookFailed(idempotencyKey, 'Failed to fetch payment from MercadoPago');
      return NextResponse.json({ status: 'error', message: 'Cannot fetch payment' }, { status: 500 });
    }

    // ── Step 4: Process based on payment status ──
    const dispatchId = paymentDetails.external_reference || paymentDetails.metadata?.dispatch_id;
    const preauthId = paymentDetails.metadata?.preauth_id || `mp_${dataId}`;

    switch (paymentDetails.status) {
      case 'approved': {
        // Payment approved — if service is completed, capture escrow
        if (dispatchId) {
          const dispatch = await prisma.dispatch.findUnique({
            where: { id: dispatchId },
            select: { status: true, price: true, finalPrice: true },
          });

          if (dispatch?.status === 'COMPLETED') {
            await captureEscrowPayment(
              preauthId,
              dispatch.finalPrice || dispatch.price,
              `mp_capture_${dispatchId}`
            );

            await prisma.dispatch.update({
              where: { id: dispatchId },
              data: { status: 'PAYMENT_CAPTURED' },
            });
          }
        }
        break;
      }

      case 'refunded': {
        // MercadoPago processed a refund
        if (dispatchId) {
          await prisma.dispatch.update({
            where: { id: dispatchId },
            data: { status: 'REFUNDED' },
          });
        }
        break;
      }

      case 'rejected':
      case 'cancelled': {
        // Payment failed
        if (dispatchId) {
          await releaseEscrowPayment(
            preauthId,
            `mp_release_${dispatchId}`,
            paymentDetails.transaction_amount
          );

          await prisma.dispatch.update({
            where: { id: dispatchId },
            data: { status: 'PAYMENT_FAILED' },
          });
        }
        break;
      }

      case 'in_process':
      case 'pending': {
        // Payment still processing — no action needed, wait for next webhook
        break;
      }

      default: {
        console.warn(`[AVO Webhook] Unknown payment status: ${paymentDetails.status}`);
      }
    }

    // ── Step 5: Mark event as completed ──
    await prisma.webhookEvent.update({
      where: { idempotencyKey },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[AVO Webhook] Processing error:', error);
    await markWebhookFailed(
      idempotencyKey,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Return 500 so MercadoPago retries
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// MercadoPago API (Fetch Payment Details)
// ─────────────────────────────────────────────

interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  external_reference: string | null;
  metadata: Record<string, string>;
}

async function fetchMercadoPagoPayment(
  paymentId: string
): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    // Simulation mode — return a mock approved payment
    return {
      id: parseInt(paymentId, 10) || 0,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 25000,
      external_reference: null,
      metadata: {},
    };
  }

  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`[AVO Webhook] MercadoPago GET /v1/payments/${paymentId} returned ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[AVO Webhook] MercadoPago API error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function markWebhookFailed(idempotencyKey: string, errorMessage: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { idempotencyKey },
    data: {
      status: 'FAILED',
      errorMessage,
      processedAt: new Date(),
    },
  });
}
