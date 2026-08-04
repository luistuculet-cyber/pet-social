import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp('(^| )avo_session=([^;]+)'));
    if (!match) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const token = match[2];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sesión expirada o inválida' }, { status: 401 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isPremium: true,
          status: true,
          mustChangePassword: true,
          phone: true,
          address: true,
          licenseNumber: true,
          university: true,
          actionRadiusKm: true,
          createdAt: true,
        },
      });

      if (user) {
        return NextResponse.json({ success: true, user });
      }
    } catch (dbError) {
      console.warn('DB me fallback:', dbError);
    }

    // Fallback in-memory si DB no disponible
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.role === 'admin' ? 'G3r3nt3' : 'Dr. Roberto Martínez',
      },
    });
  } catch (error) {
    console.error('GET /api/auth/me Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener sesión actual' },
      { status: 500 }
    );
  }
}
