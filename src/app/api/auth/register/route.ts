import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createToken, validatePasswordComplexity } from '@/lib/auth';
import { rateLimit, getClientIp, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`register:${ip}`, RATE_LIMIT_CONFIG.register.limit, RATE_LIMIT_CONFIG.register.windowMs);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Demasiados intentos de registro. Espera ${rl.resetInSeconds} segundos.` },
        { status: 429 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, any> = {};
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      body = await request.json();
    }
    const {
      name,
      email,
      password,
      role = 'tutor',
      phone,
      licenseNumber,
      university,
      address,
      cbu,
      lat,
      lng,
      actionRadiusKm = 15,
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const complexity = validatePasswordComplexity(String(password));
    if (!complexity.valid) {
      return NextResponse.json(
        { error: `Contraseña insegura: ${complexity.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    if (cleanName.length > 100) {
      return NextResponse.json(
        { error: 'El nombre excede los 100 caracteres' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = String(email).trim();
    if (cleanEmail.length > 191 || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Formato de email inválido o excede 191 caracteres' },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener mínimo 8 caracteres' },
        { status: 400 }
      );
    }

    if (licenseNumber) {
      const cleanLicense = String(licenseNumber).trim();
      const licenseRegex = /^[a-zA-Z0-9\s]+$/;
      if (cleanLicense.length > 20 || !licenseRegex.test(cleanLicense)) {
        return NextResponse.json(
          { error: 'El número de matrícula solo permite alfanuméricos y máximo 20 caracteres' },
          { status: 400 }
        );
      }
    }

    try {
      const existingUser = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });
      if (existingUser) {
        if (role === 'tutor' || existingUser.role === 'tutor') {
          const token = createToken({
            userId: existingUser.id,
            role: existingUser.role,
            email: existingUser.email || '',
          });
          const response = NextResponse.json({ success: true, user: existingUser, existing: true }, { status: 200 });
          response.cookies.set('avo_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400,
            path: '/',
          });
          return response;
        }
        return NextResponse.json(
          { error: 'El email ya está registrado' },
          { status: 409 }
        );
      }
    } catch (dbError) {
      console.warn('DB register check error:', dbError);
      // Continuamos o intentamos crear
    }

    const passwordHash = await hashPassword(password);
    const status = 'active'; // Vets activos por defecto para poder recibir video consultas y emergencias al instante

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          role,
          status,
          phone: phone || null,
          licenseNumber: licenseNumber ? String(licenseNumber).trim() : null,
          university: university || null,
          address: address || null,
          cbu: cbu || null,
          lat: lat !== undefined ? Number(lat) : null,
          lng: lng !== undefined ? Number(lng) : null,
          actionRadiusKm: actionRadiusKm !== undefined ? Number(actionRadiusKm) : 15,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (dbError) {
      console.warn('DB register fallback:', dbError);
      // Fallback in-memory si BD offline
      user = {
        id: `u-${Date.now()}`,
        name,
        email,
        role,
        status,
        createdAt: new Date(),
      };
    }

    const token = createToken({
      userId: user.id,
      role: user.role,
      email: user.email || '',
    });

    const response = NextResponse.json({ success: true, user }, { status: 201 });
    response.cookies.set('avo_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('POST /api/auth/register Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar el registro' },
      { status: 500 }
    );
  }
}
