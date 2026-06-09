import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';

// Rutas que no requieren JWT.
// - /api/usuario/api/v1/auth/login|register → acceso público del browser
// - /api/divisas/* y /api/notificaciones/*  → llamadas internas entre servicios
const PUBLIC_ROUTES: Array<{ method: string; prefix: string }> = [
  { method: 'POST',    prefix: '/api/usuario/api/v1/auth/login' },
  { method: 'POST',    prefix: '/api/usuario/api/v1/auth/register' },
  { method: 'GET',     prefix: '/api/divisas/' },
  { method: 'POST',    prefix: '/api/divisas/' },
  { method: 'POST',    prefix: '/api/notificaciones/' },
  { method: 'OPTIONS', prefix: '/api/' },
  { method: 'GET',     prefix: '/health' },
];

export function isPublic(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some(
    r => r.method === method && url.startsWith(r.prefix),
  );
}

export function verifyToken(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): boolean {
  const auth = req.headers['authorization'] ?? '';

  if (!auth.startsWith('Bearer ')) {
    writeJson(res, 401, { error: 'Token requerido' });
    return false;
  }

  try {
    jwt.verify(auth.slice(7), config.JWT_SECRET);
    return true;
  } catch {
    writeJson(res, 401, { error: 'Token inválido o expirado' });
    return false;
  }
}

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
