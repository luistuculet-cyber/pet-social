import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromCookies, hashPassword, validatePasswordComplexity } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = getSessionFromCookies(request.headers.get('cookie'));
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { error: 'Debes proporcionar una nueva contraseña' },
        { status: 400 }
      );
    }

    const complexity = validatePasswordComplexity(String(newPassword));
    if (!complexity.valid) {
      return NextResponse.json(
        { error: `Contraseña insegura: ${complexity.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(String(newPassword));

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        mustChangePassword: updatedUser.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Error en POST /api/auth/change-password:', error);
    return NextResponse.json(
      { error: 'Error interno al cambiar contraseña' },
      { status: 500 }
    );
  }
}
