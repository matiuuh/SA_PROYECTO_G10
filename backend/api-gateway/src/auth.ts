import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';

// Rutas que no requieren JWT.
const PUBLIC_ROUTES: Array<{ method: string; prefix: string }> = [
  // Auth pública
  { method: 'POST',    prefix: '/api/usuario/api/v1/auth/login' },
  { method: 'POST',    prefix: '/api/usuario/api/v1/auth/register' },
  // Endpoint interno: catálogo lo llama sin JWT para resolver emails al enviar alertas
  { method: 'GET',     prefix: '/api/usuario/api/v1/internal/' },
  // Catálogo — lecturas (el frontend no pasa token para browsing)
  { method: 'GET',     prefix: '/api/catalogo/' },
  // Suscripción — el frontend no pasa token en ninguna de sus llamadas
  { method: 'GET',     prefix: '/api/suscripcion/' },
  { method: 'POST',    prefix: '/api/suscripcion/' },
  { method: 'PUT',     prefix: '/api/suscripcion/' },
  // Divisas y notificaciones — inter-servicio
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
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}
