import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignNextAvailableVet } from '@/lib/dispatch-engine';
import { getSessionFromCookies } from '@/lib/auth';

/**
 * POST /api/admin/operations/override
 * Intervención manual del despachador / administrador:
 * - action: 'reassign' | 'next' | 'cancel' | 'status'
 */
export async function POST(request: Request) {
  try {
    const session = getSessionFromCookies(request.headers.get('cookie'));
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado - se requiere rol admin' }, { status: 401 });
    }

    const body = await request.json();
    const { dispatchId, action, targetVetId, newStatus } = body;

    if (!dispatchId || !action) {
      return NextResponse.json(
        { error: 'Se requieren dispatchId y action' },
        { status: 400 }
      );
    }

    const cleanDispatchId = String(dispatchId).trim();
    const cleanAction = String(action).trim();

    if (cleanAction === 'reassign' && targetVetId) {
      // Reasignación manual directa al veterinario seleccionado
      const expiresAt = new Date(Date.now() + 45 * 1000);
      const updated = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'offered',
          offeredVetId: targetVetId,
          offerExpiresAt: expiresAt,
          attemptCount: { increment: 1 },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Solicitud reasignada manualmente a ${targetVetId}`,
        dispatch: updated,
      });
    }

    if (action === 'next') {
      // Forzar avance al siguiente veterinario en la cola
      const res = await assignNextAvailableVet(dispatchId);
      return NextResponse.json(res);
    }

    if (action === 'cancel') {
      // Cancelación manual por administrador
      const updated = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'cancelled',
          offeredVetId: null,
          offerExpiresAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitud cancelada administrativamente',
        dispatch: updated,
      });
    }

    if (action === 'status' && newStatus) {
      // Cambio manual de estado (e.g. accepted -> in_progress -> completed)
      const updated = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: newStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Estado actualizado a ${newStatus}`,
        dispatch: updated,
      });
    }

    return NextResponse.json(
      { error: 'Acción no reconocida en override' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/admin/operations/override Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
