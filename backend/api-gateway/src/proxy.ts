import http from 'http';
import { ServiceTarget } from './config';

// Headers que no deben reenviarse al servicio destino
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
]);

function forwardHeaders(
  incoming: http.IncomingHttpHeaders,
  target: ServiceTarget,
): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (!HOP_BY_HOP.has(k)) out[k] = v;
  }
  out['host'] = `${target.hostname}:${target.port}`;
  return out;
}

// Reescribe la URL eliminando el prefijo de servicio.
// Ej: /api/usuario/api/v1/auth/me → /api/v1/auth/me
export function rewriteUrl(originalUrl: string, prefix: string): string {
  const stripped = originalUrl.slice(prefix.length);
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export function proxyTo(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  target: ServiceTarget,
  rewrittenUrl: string,
): void {
  const proxyReq = http.request(
    {
      hostname: target.hostname,
      port: target.port,
      path: rewrittenUrl,
      method: req.method,
      headers: forwardHeaders(req.headers, target),
    },
    (proxyRes) => {
      const headers = Object.assign({}, proxyRes.headers, {
        'access-control-allow-origin':  '*',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
      });
      res.writeHead(proxyRes.statusCode ?? 502, headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on('error', (err: Error) => {
    console.error(`[gateway] proxy error → ${target.hostname}:${target.port} — ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'access-control-allow-origin': '*',
      });
      res.end(JSON.stringify({ error: 'Servicio no disponible', detail: err.message }));
    }
  });

  req.pipe(proxyReq, { end: true });
}
