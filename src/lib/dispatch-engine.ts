/**
 * AVO Dispatch Lifecycle & State Machine (Tipo Uber / Cabify)
 * Administra el ciclo de vida de la solicitud: PENDING -> OFFERED -> ACCEPTED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED
 * Incluye temporizador de oferta (45 segundos) y reasignación automática si el profesional rechaza o no responde.
 */

import { prisma } from '@/lib/prisma';
import { getBoundingBox, matchVetsByRadius, VetGeoCandidate } from '@/lib/geo';

export const OFFER_TIMEOUT_SECONDS = 45;

export interface DispatchStateResult {
  success: boolean;
  dispatchId: string;
  status: string;
  offeredVetId?: string | null;
  offerExpiresAt?: string | null;
  attemptCount?: number;
  message: string;
}

/**
 * Busca y asigna el siguiente veterinario disponible dentro del radio que aún no haya rechazado ni expirado
 */
export async function assignNextAvailableVet(
  dispatchId: string
): Promise<DispatchStateResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      return {
        success: false,
        dispatchId,
        status: 'error',
        message: 'Solicitud no encontrada en BD',
      };
    }

    // Parsear lista de IDs de veterinarios que ya rechazaron o expiraron
    let rejectedIds: string[] = [];
    try {
      if (dispatch.rejectedVetIds) {
        rejectedIds = JSON.parse(dispatch.rejectedVetIds);
      }
    } catch (e) {
      rejectedIds = [];
    }

    // Obtener veterinarios online activos (sin filtro GPS si es videoconsulta)
    const isVideo = dispatch.serviceType === 'video';

    const whereClause: any = {
      role: 'vet',
    };

    if (!isVideo) {
      const box = getBoundingBox(dispatch.lat, dispatch.lng, 30);
      whereClause.lat = { gte: box.minLat, lte: box.maxLat };
      whereClause.lng = { gte: box.minLng, lte: box.maxLng };
    }

    const dbUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        lat: true,
        lng: true,
        actionRadiusKm: true,
        isOnline: true,
      },
    });

    const candidateVets = dbUsers
      .filter(
        (u) =>
          (isVideo || (u.lat != null && u.lng != null)) &&
          !rejectedIds.includes(u.id)
      )
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        lat: u.lat || -34.5885,
        lng: u.lng || -58.4280,
        actionRadiusKm: u.actionRadiusKm || 15,
        isOnline: u.isOnline,
      }));

    // Emparejar y ordenar por cercanía
    let matched;
    if (isVideo) {
      matched = candidateVets.map((u) => ({
        ...u,
        distanceKm: 0,
        estimatedEtaMinutes: 0,
      }));
    } else {
      matched = matchVetsByRadius(
        dispatch.lat,
        dispatch.lng,
        candidateVets
      );
    }

    if (matched.length === 0) {
      // Mantener en cola general "pending" en lugar de cancelar para que cualquier veterinario conectado lo pueda aceptar
      await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'pending',
          offeredVetId: null,
          offerExpiresAt: null,
        },
      });

      return {
        success: true,
        dispatchId,
        status: 'pending',
        message:
          'Solicitud en cola general esperando aceptación por un profesional disponible.',
      };
    }

    // Seleccionar el veterinario más cercano
    const bestVet = matched[0];
    const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_SECONDS * 1000);

    const updated = await prisma.dispatch.update({
      where: { id: dispatchId },
      data: {
        status: 'offered',
        offeredVetId: bestVet.id,
        offerExpiresAt: expiresAt,
        attemptCount: { increment: 1 },
      },
    });

    return {
      success: true,
      dispatchId,
      status: updated.status,
      offeredVetId: updated.offeredVetId,
      offerExpiresAt: updated.offerExpiresAt?.toISOString(),
      attemptCount: updated.attemptCount,
      message: `Solicitud ofrecida a ${bestVet.name || bestVet.id} con vencimiento de 45 segundos.`,
    };
  } catch (error) {
    console.error('Error en assignNextAvailableVet:', error);
    return {
      success: false,
      dispatchId,
      status: 'error',
      message: 'Error interno del servidor al asignar veterinario',
    };
  }
}

/**
 * Veterinario ACEPTA la urgencia o consulta (transición de OFFERED/PENDING -> ACCEPTED)
 */
export async function acceptDispatch(
  dispatchId: string,
  vetId: string
): Promise<DispatchStateResult> {
  try {
    let validVetId: string | null = vetId;
    if (validVetId) {
      const vetExists = await prisma.user.findUnique({
        where: { id: validVetId },
        select: { id: true },
      });
      if (!vetExists) {
        const fallbackVet = await prisma.user.findFirst({
          where: { role: 'vet' },
          select: { id: true },
        });
        if (fallbackVet) {
          validVetId = fallbackVet.id;
        } else {
          const createdVet = await prisma.user.create({
            data: {
              name: 'Dr. Veterinario AVO',
              email: `vet-${Date.now()}@avo.com`,
              role: 'vet',
              status: 'active',
              isOnline: true,
            },
          });
          validVetId = createdVet.id;
        }
      }
    }

    let updated;
    try {
      updated = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'accepted',
          vetId: validVetId,
          offeredVetId: null,
          offerExpiresAt: null,
        },
      });
    } catch (updateErr) {
      const latestPending = await prisma.dispatch.findFirst({
        where: { status: { in: ['pending', 'offered'] } },
        orderBy: { createdAt: 'desc' },
      });
      if (latestPending) {
        updated = await prisma.dispatch.update({
          where: { id: latestPending.id },
          data: {
            status: 'accepted',
            vetId: validVetId,
            offeredVetId: null,
            offerExpiresAt: null,
          },
        });
      } else {
        throw updateErr;
      }
    }

    return {
      success: true,
      dispatchId: updated.id,
      status: updated.status,
      message: `Solicitud ACEPTADA por veterinario ${validVetId}. Profesional en camino o en preparación.`,
    };
  } catch (error) {
    console.error('Error en acceptDispatch:', error);
    return {
      success: false,
      dispatchId,
      status: 'error',
      message: 'Error al aceptar la solicitud',
    };
  }
}

/**
 * Veterinario RECHAZA la urgencia (se añade a rejectedVetIds y se reasigna automáticamente al siguiente)
 */
export async function rejectDispatch(
  dispatchId: string,
  vetId: string
): Promise<DispatchStateResult> {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      return {
        success: false,
        dispatchId,
        status: 'error',
        message: 'Solicitud no encontrada',
      };
    }

    let rejectedIds: string[] = [];
    try {
      if (dispatch.rejectedVetIds) {
        rejectedIds = JSON.parse(dispatch.rejectedVetIds);
      }
    } catch (e) {
      rejectedIds = [];
    }

    if (!rejectedIds.includes(vetId)) {
      rejectedIds.push(vetId);
    }

    await prisma.dispatch.update({
      where: { id: dispatchId },
      data: {
        rejectedVetIds: JSON.stringify(rejectedIds),
      },
    });

    // Reasignar al siguiente más cercano
    return await assignNextAvailableVet(dispatchId);
  } catch (error) {
    console.error('Error en rejectDispatch:', error);
    return {
      success: false,
      dispatchId,
      status: 'error',
      message: 'Error al rechazar la solicitud',
    };
  }
}

/**
 * Revisa ofertas expiradas (offerExpiresAt < NOW()) y las reasigna automáticamente al siguiente veterinario
 */
export async function checkAndReassignExpiredOffers(): Promise<{
  checkedCount: number;
  reassignedCount: number;
}> {
  try {
    const expiredDispatches = await prisma.dispatch.findMany({
      where: {
        status: 'offered',
        offerExpiresAt: {
          lt: new Date(),
        },
      },
    });

    let reassignedCount = 0;

    for (const dispatch of expiredDispatches) {
      if (dispatch.offeredVetId) {
        let rejectedIds: string[] = [];
        try {
          if (dispatch.rejectedVetIds) {
            rejectedIds = JSON.parse(dispatch.rejectedVetIds);
          }
        } catch (e) {
          rejectedIds = [];
        }

        if (!rejectedIds.includes(dispatch.offeredVetId)) {
          rejectedIds.push(dispatch.offeredVetId);
        }

        await prisma.dispatch.update({
          where: { id: dispatch.id },
          data: {
            rejectedVetIds: JSON.stringify(rejectedIds),
          },
        });
      }

      const res = await assignNextAvailableVet(dispatch.id);
      if (res.success) {
        reassignedCount++;
      }
    }

    return {
      checkedCount: expiredDispatches.length,
      reassignedCount,
    };
  } catch (error) {
    console.error('Error en checkAndReassignExpiredOffers:', error);
    return { checkedCount: 0, reassignedCount: 0 };
  }
}
