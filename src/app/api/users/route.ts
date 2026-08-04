import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Usuarios de demostración iniciales
const mockUsers = [
  {
    id: "u-1",
    name: "María Fernández",
    email: "maria.tutor@ejemplo.com",
    role: "tutor",
    isPremium: false,
    status: "active",
    createdAt: "2026-07-20 14:30"
  },
  {
    id: "u-2",
    name: "Dr. Roberto Martínez",
    email: "dr.martinez@ejemplo.com",
    role: "vet",
    isPremium: true,
    status: "active",
    actionRadiusKm: 15,
    createdAt: "2026-07-18 10:15"
  },
  {
    id: "u-3",
    name: "Dra. Sofía Valenzuela",
    email: "dra.valenzuela@ejemplo.com",
    role: "vet",
    isPremium: true,
    status: "active",
    actionRadiusKm: 20,
    createdAt: "2026-07-22 09:00"
  },
  {
    id: "u-4",
    name: "Carlos Gerencia",
    email: "gerencia@avo.com",
    role: "manager",
    isPremium: true,
    status: "active",
    createdAt: "2026-07-15 08:00"
  },
  {
    id: "u-5",
    name: "G3r3nt3",
    email: "admin@avo.com",
    role: "admin",
    isPremium: true,
    status: "active",
    createdAt: "2026-07-10 12:00"
  }
];

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' }
        });
        if (users && users.length > 0) {
          return NextResponse.json(users);
        }
      } catch (e) {
        console.error('Error al consultar usuarios en MySQL:', e);
      }
    }
    return NextResponse.json(mockUsers);
  } catch (error) {
    console.error('GET /api/users Error:', error);
    return NextResponse.json(mockUsers);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, newRole, status, name, email, role, password } = body;
    const targetId = userId || body.id;

    // Acción: Actualizar estado (aprobar / rechazar veterinario o usuario)
    if (action === 'update_status') {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.user.update({
            where: { id: targetId },
            data: { status }
          });
        } catch (err) {
          console.warn('DB update status fallback:', err);
        }
      }
      return NextResponse.json({ success: true, userId: targetId, status });
    }

    // Acción: Forzar cambio de clave por el administrador
    if (action === 'force_password_change') {
      const { mustChangePassword = true } = body;
      if (process.env.DATABASE_URL) {
        try {
          await prisma.user.update({
            where: { id: targetId },
            data: { mustChangePassword: Boolean(mustChangePassword) }
          });
        } catch (err) {
          console.warn('DB force_password_change fallback:', err);
        }
      }
      return NextResponse.json({ success: true, userId: targetId, mustChangePassword: Boolean(mustChangePassword) });
    }

    // Acción: Eliminar usuario / profesional
    if (action === 'delete_user' || action === 'delete_professional' || action === 'delete') {
      if (process.env.DATABASE_URL && targetId) {
        try {
          await prisma.user.delete({
            where: { id: targetId }
          });
        } catch (err) {
          console.warn('DB delete user fallback:', err);
        }
      }
      return NextResponse.json({ success: true, userId: targetId });
    }

    // Acción: Crear nuevo usuario manager/admin
    if (action === 'create') {
      const newUser = {
        id: `u-${Date.now()}`,
        name: name || 'Nuevo Usuario',
        email: email || `user-${Date.now()}@avo.com`,
        role: role || 'manager',
        isPremium: true,
        status: 'active',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      if (process.env.DATABASE_URL) {
        try {
          const dbUser = await prisma.user.create({
            data: {
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              isPremium: true,
            }
          });
          return NextResponse.json({ success: true, user: dbUser });
        } catch (err) {
          console.warn('DB create user fallback:', err);
        }
      }

      return NextResponse.json({ success: true, user: newUser });
    }

    // Acción: Actualizar rol de usuario existente
    if (action === 'update_role') {
      if (process.env.DATABASE_URL) {
        try {
          await prisma.user.update({
            where: { id: targetId },
            data: { role: newRole }
          });
        } catch (err) {
          console.warn('DB update role fallback:', err);
        }
      }
      return NextResponse.json({ success: true, userId: targetId, newRole });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/users Error:', error);
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 });
  }
}
