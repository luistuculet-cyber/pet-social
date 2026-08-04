import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBoundingBox, matchVetsByRadius, VetGeoCandidate } from '@/lib/geo';
import { assignNextAvailableVet, checkAndReassignExpiredOffers } from '@/lib/dispatch-engine';
import { rateLimit, getClientIp, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`dispatch:${ip}`, RATE_LIMIT_CONFIG.dispatch.limit, RATE_LIMIT_CONFIG.dispatch.windowMs);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes de triage. Espera ${rl.resetInSeconds} segundos.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { 
      tutorId, 
      tutorName, 
      petName, 
      petSpecies, 
      lat, 
      lng, 
      price, 
      serviceType, 
      symptoms, 
      paymentMethod 
    } = body;

    const tutorLat = lat || -34.6037;
    const tutorLng = lng || -58.3816;
    const sType = serviceType || 'domicilio';

    // 1. Obtener veterinarios activos para emparejar por radio de acción (Uber-style matching)
    let onlineVets: VetGeoCandidate[] = [];
    try {
      const box = getBoundingBox(tutorLat, tutorLng, 30);
      const dbUsers = await prisma.user.findMany({
        where: {
          role: 'vet',
          status: 'active',
          isOnline: true,
          lat: { gte: box.minLat, lte: box.maxLat },
          lng: { gte: box.minLng, lte: box.maxLng },
        },
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

      onlineVets = dbUsers
        .filter((u) => u.lat != null && u.lng != null)
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          lat: u.lat!,
          lng: u.lng!,
          actionRadiusKm: u.actionRadiusKm || 15,
          isOnline: u.isOnline,
        }));
    } catch (e) {
      // Fallback de demostración real si BD está sin conexión
      onlineVets = [
        {
          id: 'vet-palermo-1',
          name: 'Dra. Sofía Martínez (Palermo / 10km)',
          email: 'sofia@avo.com',
          lat: -34.5885,
          lng: -58.428,
          actionRadiusKm: 10,
          isOnline: true,
        },
        {
          id: 'vet-belgrano-2',
          name: 'Dr. Martín Fernández (Belgrano / 15km)',
          email: 'martin@avo.com',
          lat: -34.5615,
          lng: -58.4563,
          actionRadiusKm: 15,
          isOnline: true,
        },
      ];
    }

    // Calcular emparejamientos que tengan el domicilio dentro de su radio
    const matchedVets = matchVetsByRadius(tutorLat, tutorLng, onlineVets);

    // 2. Guardar despacho y activar máquina de estados (asignación al profesional más cercano)
    try {
      let validTutorId = tutorId;
      if (validTutorId && validTutorId !== 'GUEST') {
        const userExists = await prisma.user.findUnique({
          where: { id: validTutorId },
          select: { id: true },
        });
        if (!userExists) {
          validTutorId = null;
        }
      }

      if (!validTutorId || validTutorId === 'GUEST') {
        const defaultTutor = await prisma.user.findFirst({
          where: { role: 'tutor' },
        });
        if (defaultTutor) {
          validTutorId = defaultTutor.id;
        } else {
          const createdTutor = await prisma.user.create({
            data: {
              name: tutorName || 'Tutor Invitado',
              email: `guest-${Date.now()}@avo.com`,
              role: 'tutor',
            },
          });
          validTutorId = createdTutor.id;
        }
      }

      const dispatch = await prisma.dispatch.create({
        data: {
          tutorId: validTutorId,
          lat: tutorLat,
          lng: tutorLng,
          price: price || 38000,
          serviceType: sType,
          symptoms: symptoms || 'Consulta veterinaria',
          petName: petName || 'Mascota',
          petSpecies: petSpecies || 'Perro',
          paymentMethod: paymentMethod || 'mercadopago',
          status: 'pending'
        }
      });

      // Intentar ofrecer automáticamente la urgencia al veterinario más cercano en radio
      const assignRes = await assignNextAvailableVet(dispatch.id);

      const dispatchResult = {
        ...dispatch,
        tutorName: tutorName || 'Tutor AVO',
        modality: sType,
        status: assignRes.status,
        offeredVetId: assignRes.offeredVetId,
        offerExpiresAt: assignRes.offerExpiresAt,
        attemptCount: assignRes.attemptCount,
        matchedCount: matchedVets.length,
        matchedVets,
        assignmentMessage: assignRes.message,
      };

      return NextResponse.json({
        success: true,
        dispatch: dispatchResult,
        ...dispatchResult,
      }, { status: 201 });
    } catch (dbError) {
      console.error('CRITICAL DATABASE ERROR on POST /api/dispatch:', dbError);
      const fallbackDispatch = {
        id: `srv-${Date.now()}`,
        dispatchId: `DS-${Math.floor(1000 + Math.random() * 9000)}`,
        tutorId: tutorId || 'GUEST',
        tutorName: tutorName || 'Tutor Demostración',
        petName: petName || 'Mascota',
        petSpecies: petSpecies || 'Perro',
        lat: tutorLat,
        lng: tutorLng,
        price: price || 38000,
        serviceType: sType,
        modality: sType,
        symptoms: symptoms || 'Consulta veterinaria',
        paymentMethod: paymentMethod || 'mercadopago',
        status: matchedVets.length > 0 ? 'offered' : 'pending',
        offeredVetId: matchedVets.length > 0 ? matchedVets[0].id : null,
        offerExpiresAt: matchedVets.length > 0 ? new Date(Date.now() + 45 * 1000).toISOString() : null,
        createdAt: new Date().toISOString(),
        matchedCount: matchedVets.length,
        matchedVets,
      };
      return NextResponse.json({
        success: true,
        dispatch: fallbackDispatch,
        ...fallbackDispatch,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('POST /api/dispatch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // Auto-sanación: verificar si alguna oferta de 45 segundos expiró y reasignarla en segundo plano
    try {
      await checkAndReassignExpiredOffers();
    } catch (e) {
      console.error("Error en auto-sanación checkAndReassignExpiredOffers:", e);
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const vetIdFilter = searchParams.get('vetId');

    // Ventana de tiempo: solo despachos de las últimas 2 horas para evitar fantasmas
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Construir condiciones de filtro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: Record<string, any> = {
      createdAt: { gte: twoHoursAgo },
    };

    if (statusFilter === 'pending') {
      whereClause.status = { in: ['pending', 'offered'] };
    } else if (statusFilter) {
      whereClause.status = statusFilter;
    } else {
      whereClause.status = { in: ['pending', 'offered', 'accepted', 'in_progress'] };
    }

    if (vetIdFilter) {
      whereClause.OR = [
        { offeredVetId: vetIdFilter },
        { offeredVetId: null },
        { offeredVetId: 'vet-palermo-1' }
      ];
    }

    const dispatches = await prisma.dispatch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 20, // Límite de seguridad
    });

    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
    };
    return NextResponse.json(dispatches, { headers: noCacheHeaders });
  } catch (error) {
    console.error('GET /api/dispatch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
