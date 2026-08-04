import { NextResponse } from 'next/server';
import { rejectDispatch } from '@/lib/dispatch-engine';

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

    const result = await rejectDispatch(id, vetId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('POST /api/dispatch/[id]/reject Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
