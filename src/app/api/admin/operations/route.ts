import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndReassignExpiredOffers } from '@/lib/dispatch-engine';
import { getSessionFromCookies } from '@/lib/auth';

/**
 * GET /api/admin/operations
 * Devuelve el estado en tiempo real de la "Torre de Control":
 * - Todos los veterinarios (coordenadas, estado online, radio de acción)
 * - Todas las solicitudes activas e históricas con su estado actual (offered, accepted, in_progress, etc.)
 */
export async function GET(request: Request) {
  try {
    const session = getSessionFromCookies(request.headers.get('cookie'));
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado - se requiere sesión admin' }, { status: 401 });
    }
    // 1. Ejecutar auto-sanación / expiración de ofertas en segundo plano
    try {
      await checkAndReassignExpiredOffers();
    } catch (e) {
      console.error('Error en checkAndReassignExpiredOffers admin operations:', e);
    }

    // 2. Cargar veterinarios de la BD
    let vets = [];
    try {
      const dbVets = await prisma.user.findMany({
        where: { role: 'vet' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lat: true,
          lng: true,
          isOnline: true,
          actionRadiusKm: true,
        },
      });

      vets = dbVets.map((v) => ({
        id: v.id,
        name: v.name || 'Veterinario AVO',
        email: v.email,
        status: v.status || 'active',
        lat: v.lat ?? -34.5885,
        lng: v.lng ?? -58.428,
        isOnline: v.isOnline ?? true,
        actionRadiusKm: v.actionRadiusKm ?? 15,
      }));
    } catch (e) {
      console.warn('Fallback vets in /api/admin/operations:', e);
      vets = [
        {
          id: 'vet-palermo-1',
          name: 'Dra. Sofía Martínez (Palermo)',
          email: 'sofia@avo.com',
          status: 'active',
          lat: -34.5885,
          lng: -58.428,
          isOnline: true,
          actionRadiusKm: 12,
        },
        {
          id: 'vet-belgrano-2',
          name: 'Dr. Martín Fernández (Belgrano)',
          email: 'martin@avo.com',
          status: 'active',
          lat: -34.5615,
          lng: -58.4563,
          isOnline: true,
          actionRadiusKm: 15,
        },
        {
          id: 'vet-caballito-3',
          name: 'Dra. Laura Gómez (Caballito)',
          email: 'laura@avo.com',
          status: 'active',
          lat: -34.6189,
          lng: -58.4385,
          isOnline: false,
          actionRadiusKm: 8,
        },
      ];
    }

    // 3. Cargar solicitudes de la BD
    let dispatches = [];
    try {
      const dbDispatches = await prisma.dispatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      dispatches = dbDispatches.map((d) => ({
        id: d.id,
        tutorId: d.tutorId,
        vetId: d.vetId,
        offeredVetId: d.offeredVetId,
        offerExpiresAt: d.offerExpiresAt?.toISOString() || null,
        attemptCount: d.attemptCount || 0,
        lat: d.lat,
        lng: d.lng,
        status: d.status,
        price: d.price,
        serviceType: d.serviceType,
        symptoms: d.symptoms,
        petName: d.petName || 'Mascota',
        petSpecies: d.petSpecies || 'Perro',
        createdAt: d.createdAt.toISOString(),
      }));
    } catch (e) {
      console.warn('Fallback dispatches in /api/admin/operations:', e);
      dispatches = [
        {
          id: 'demo-dispatch-1',
          tutorId: 'usr-carlos',
          vetId: null,
          offeredVetId: 'vet-palermo-1',
          offerExpiresAt: new Date(Date.now() + 35 * 1000).toISOString(),
          attemptCount: 1,
          lat: -34.598,
          lng: -58.421,
          status: 'offered',
          price: 38000,
          serviceType: 'domicilio',
          symptoms: 'Vómitos repetidos y decaimiento',
          petName: 'Toby',
          petSpecies: 'Perro (Caniche Toy)',
          createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        },
        {
          id: 'demo-dispatch-2',
          tutorId: 'usr-maria',
          vetId: 'vet-belgrano-2',
          offeredVetId: null,
          offerExpiresAt: null,
          attemptCount: 1,
          lat: -34.558,
          lng: -58.461,
          status: 'accepted',
          price: 38000,
          serviceType: 'domicilio',
          symptoms: 'Herida en pata trasera por accidente',
          petName: 'Lola',
          petSpecies: 'Perro (Labrador)',
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
      ];
    }

    // 4. Resumen de Estadísticas Operativas
    const activeDispatchesCount = dispatches.filter(
      (d) => d.status !== 'completed' && d.status !== 'cancelled'
    ).length;
    const onlineVetsCount = vets.filter((v) => v.isOnline).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        activeDispatchesCount,
        onlineVetsCount,
        totalVets: vets.length,
        totalDispatches: dispatches.length,
      },
      vets,
      dispatches,
    });
  } catch (error) {
    console.error('GET /api/admin/operations Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
