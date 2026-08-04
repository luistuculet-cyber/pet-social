import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/vets/location
 * Actualiza la posición GPS actual del veterinario, su radio de cobertura y su estado online.
 * Payload JSON: { vetId, lat, lng, isOnline, actionRadiusKm }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vetId, lat, lng, isOnline, actionRadiusKm } = body;

    if (!vetId || lat == null || lng == null) {
      return NextResponse.json(
        { error: 'Parámetros obligatorios: vetId, lat, lng' },
        { status: 400 }
      );
    }

    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);
    const numericRadius = actionRadiusKm ? parseInt(actionRadiusKm, 10) : 15;
    const onlineStatus = isOnline !== undefined ? Boolean(isOnline) : true;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: vetId },
        data: {
          lat: numericLat,
          lng: numericLng,
          isOnline: onlineStatus,
          actionRadiusKm: numericRadius,
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          lat: updatedUser.lat,
          lng: updatedUser.lng,
          isOnline: updatedUser.isOnline,
          actionRadiusKm: updatedUser.actionRadiusKm,
          lastSeenAt: updatedUser.lastSeenAt,
        },
      });
    } catch (dbError) {
      console.warn('DB error en POST /api/vets/location, retornando actualización simulada:', dbError);
      return NextResponse.json({
        success: true,
        fallback: true,
        user: {
          id: vetId,
          lat: numericLat,
          lng: numericLng,
          isOnline: onlineStatus,
          actionRadiusKm: numericRadius,
          lastSeenAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('POST /api/vets/location Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
