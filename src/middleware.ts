import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwtPayload(token: string): { userId?: string; role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas / estáticas que siempre se permiten
  if (
    pathname === '/' ||
    pathname === '/solicitar' ||
    pathname === '/pago' ||
    pathname === '/espera' ||
    pathname === '/finalizado' ||
    pathname === '/vet/registro' ||
    pathname === '/vet/login' ||
    pathname === '/tutor/login' ||
    pathname === '/admin/login' ||
    pathname === '/registro-tutor' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('avo_session');
  const token = tokenCookie?.value;

  if (pathname.startsWith('/vet')) {
    if (!token) {
      return NextResponse.redirect(new URL('/vet/login', request.url));
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.role || payload.role !== 'vet' || (payload.exp && payload.exp * 1000 < Date.now())) {
      return NextResponse.redirect(new URL('/vet/login', request.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.role || payload.role !== 'admin' || (payload.exp && payload.exp * 1000 < Date.now())) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  if (pathname.startsWith('/tutor')) {
    if (pathname === '/tutor/login') {
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.redirect(new URL('/tutor/login', request.url));
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.role || payload.role !== 'tutor' || (payload.exp && payload.exp * 1000 < Date.now())) {
      return NextResponse.redirect(new URL('/tutor/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
