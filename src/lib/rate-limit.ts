interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpieza automática de entradas expiradas cada 60 segundos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    });
  }, 60000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Aplica rate limiting por clave (normalmente IP + ruta).
 * @param key Clave única (ej: "ip:/api/auth/login")
 * @param limit Límite máximo de solicitudes en la ventana de tiempo
 * @param windowMs Ventana de tiempo en milisegundos
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Nueva entrada o ventana expirada
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  // La ventana está activa
  if (entry.count >= limit) {
    const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  // Incrementar contador
  entry.count += 1;
  store.set(key, entry);

  const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    success: true,
    remaining: limit - entry.count,
    resetInSeconds,
  };
}

/**
 * Extrae la IP del cliente desde el objeto Request
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

// Configuración de límites por ruta
export const RATE_LIMIT_CONFIG = {
  login: { limit: 20, windowMs: 60 * 1000 },        // 20 intentos por minuto
  register: { limit: 30, windowMs: 15 * 60 * 1000 }, // 30 registros cada 15 minutos
  dispatch: { limit: 30, windowMs: 60 * 1000 },      // 30 solicitudes por minuto
};
