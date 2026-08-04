import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      dispatchId, 
      petName, 
      petSpecies, 
      petBreed, 
      petAge, 
      petWeight, 
      diagnosis, 
      treatment, 
      postCareInstructions 
    } = body;

    // We do a transaction to create the record and update the dispatch status to completed
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      const record = await tx.medicalRecord.create({
        data: {
          dispatchId,
          petName,
          petSpecies,
          petBreed,
          petAge,
          petWeight,
          diagnosis,
          treatment,
          postCareInstructions
        }
      });

      try {
        await tx.dispatch.update({
          where: { id: dispatchId },
          data: { status: 'completed' }
        });
      } catch (e) {
        console.warn("No se pudo actualizar dispatch (posible ID local mock):", e);
      }

      return record;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/medical-records Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const petName = searchParams.get('petName');

    const where: Record<string, unknown> = {};
    if (petName && petName !== 'Todos') {
      where.petName = petName;
    }

    const records = await prisma.medicalRecord.findMany({
      where,
      include: {
        dispatch: {
          include: {
            vet: {
              select: {
                name: true,
                licenseNumber: true,
              }
            },
            tutor: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ records }, { status: 200 });
  } catch (error) {
    console.error('GET /api/medical-records Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', records: [] }, { status: 500 });
  }
}
