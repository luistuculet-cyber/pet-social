import { NextResponse } from 'next/server';
import { checkAndReassignExpiredOffers } from '@/lib/dispatch-engine';

/**
 * POST / GET /api/dispatch/reassign
 * Revisa en la base de datos si alguna oferta superó el tiempo de 45 segundos de expiración (offerExpiresAt < NOW)
 * Si expiró, marca al veterinario como rechazado y reasigna al siguiente disponible en el radio de acción.
 */
export async function POST() {
  try {
    const res = await checkAndReassignExpiredOffers();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...res,
    });
  } catch (error) {
    console.error('POST /api/dispatch/reassign Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await checkAndReassignExpiredOffers();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...res,
    });
  } catch (error) {
    console.error('GET /api/dispatch/reassign Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
