import { NextResponse } from 'next/server';
import { acceptDispatch } from '@/lib/dispatch-engine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { vetId } = body;

    if (!id || !vetId) {
      return NextResponse.json(
        { error: 'Se requieren id de solicitud y vetId' },
        { status: 400 }
      );
    }

    const result = await acceptDispatch(id, vetId);
    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
    };
    if (!result.success) {
      return NextResponse.json(result, { status: 400, headers: noCacheHeaders });
    }

    return NextResponse.json(result, { status: 200, headers: noCacheHeaders });
  } catch (error) {
    console.error('POST /api/dispatch/[id]/accept Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
