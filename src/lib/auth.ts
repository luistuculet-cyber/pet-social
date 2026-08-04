import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'avo_super_secret_jwt_key_2026_9876543210_abcdefghijklmnopqrstuvwxyz';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

export function createToken(payload: { userId: string; role: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function getSessionFromCookies(cookieHeader: string | null): AuthPayload | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^| )avo_session=([^;]+)'));
  if (!match) return null;
  const token = match[2];
  return verifyToken(token);
}

export function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una letra mayúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>_+=~`'/\\[\];\-]/.test(password)) {
    errors.push('Al menos un carácter especial (!@#$...)');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

