import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sala/[id]
 * Devuelve la configuración y credenciales para la sala virtual de videoconsulta AVO.
 * Funciona tanto con despachos reales de BD como en modo demostración/fallback.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let dispatchData: Record<string, unknown> | null = null;

    try {
      const dbDispatch = await prisma.dispatch.findUnique({
        where: { id },
      });
      if (dbDispatch) {
        dispatchData = {
          id: dbDispatch.id,
          tutorId: dbDispatch.tutorId,
          vetId: dbDispatch.vetId || 'vet-online-1',
          petName: dbDispatch.petName || 'Mascota',
          petSpecies: dbDispatch.petSpecies || 'Perro',
          symptoms: dbDispatch.symptoms || 'Videoconsulta de Orientación',
          status: dbDispatch.status,
          serviceType: dbDispatch.serviceType || 'videoconsulta',
          roomName: `AVO-Consulta-2026-${dbDispatch.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        };
      }
    } catch (e) {
      console.warn('Fallback en GET /api/sala/[id]:', e);
    }

    // Fallback si no se encontró en BD o se accede con un ID de demostración
    if (!dispatchData) {
      dispatchData = {
        id: id || 'demo-video-room',
        tutorId: 'usr-carlos',
        vetId: 'vet-palermo-1',
        petName: 'Toby',
        petSpecies: 'Perro (Caniche)',
        symptoms: 'Consulta de control dermatológico / conducta',
        status: 'in_progress',
        serviceType: 'videoconsulta',
        roomName: `AVO-Consulta-2026-${id || 'demo'}`,
      };
    }

    return NextResponse.json({
      success: true,
      roomName: dispatchData.roomName,
      dispatch: dispatchData,
      serverUrl: 'https://meet.jit.si',
      config: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableInviteFunctions: true,
        subject: `Consulta AVO: ${dispatchData.petName} (${dispatchData.petSpecies})`,
      },
    });
  } catch (error) {
    console.error('GET /api/sala/[id] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
