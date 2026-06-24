import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';

type PublicRoute = {
  method: string;
  matches: (url: string) => boolean;
};

function exact(path: string): (url: string) => boolean {
  return (url) => url === path || url.startsWith(`${path}?`);
}

function startsWith(prefix: string): (url: string) => boolean {
  return (url) => url.startsWith(prefix);
}

function isPublicCatalogRead(url: string): boolean {
  return (
    exact('/api/catalogo/api/v1/catalog')(url) ||
    startsWith('/api/catalogo/api/v1/catalog/')(url) ||
    startsWith('/api/catalogo/api/v1/catalog/search')(url)
  );
}

function isPublicPlanRead(url: string): boolean {
  return (
    exact('/api/suscripcion/api/v1/plans')(url) ||
    startsWith('/api/suscripcion/api/v1/plans/')(url)
  );
}

// Rutas que no requieren JWT. Todo lo demas bajo /api/* requiere Bearer.
const PUBLIC_ROUTES: PublicRoute[] = [
  { method: 'POST', matches: exact('/api/usuario/api/v1/auth/login') },
  { method: 'POST', matches: exact('/api/usuario/api/v1/auth/register') },
  { method: 'GET', matches: startsWith('/api/usuario/api/v1/internal/') },
  { method: 'GET', matches: isPublicCatalogRead },
  { method: 'GET', matches: isPublicPlanRead },
  { method: 'GET', matches: startsWith('/api/divisas/') },
  { method: 'POST', matches: startsWith('/api/divisas/') },
  { method: 'POST', matches: startsWith('/api/notificaciones/') },
  { method: 'POST', matches: (url) => /^\/api\/usuario\/api\/v1\/profiles\/[^/]+\/verify-pin/.test(url) },
  { method: 'OPTIONS', matches: startsWith('/api/') },
  { method: 'GET', matches: exact('/health') },
];

export function isPublic(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && route.matches(url),
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
    writeJson(res, 401, { error: 'Token invalido o expirado' });
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
