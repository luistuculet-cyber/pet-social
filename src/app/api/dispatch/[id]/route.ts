import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, vetId } = body;

    const dispatch = await prisma.dispatch.update({
      where: { id },
      data: { 
        status,
        ...(vetId ? { vetId } : {})
      }
    });

    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
    };
    return NextResponse.json(dispatch, { headers: noCacheHeaders });
  } catch (error) {
    console.error(`PATCH /api/dispatch Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const dispatch = await prisma.dispatch.findUnique({
      where: { id },
      include: {
        vet: {
          select: {
            id: true,
            name: true,
            email: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
    };
    return NextResponse.json(dispatch, { headers: noCacheHeaders });
  } catch (error) {
    console.error(`GET /api/dispatch Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
