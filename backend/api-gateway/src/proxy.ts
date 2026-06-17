import http from 'http';
import net from 'net';
import { ServiceTarget } from './config';

// Headers hop-by-hop para requests HTTP normales (NO WebSocket).
// 'upgrade' y 'connection' se excluyen de esta lista porque son necesarios
// para el handshake WebSocket y se manejan aparte en proxyUpgrade().
const HOP_BY_HOP = new Set([
  'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailers', 'transfer-encoding',
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

// Maneja el upgrade HTTP→WebSocket y hace tunnel TCP bidireccional
// hacia el servicio destino. Se llama desde server.on('upgrade').
export function proxyUpgrade(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  target: ServiceTarget,
  rewrittenUrl: string,
): void {
  const serviceSocket = net.connect(target.port, target.hostname, () => {
    // Reenvía la petición de upgrade al servicio con todos los headers originales
    const headers = forwardHeaders(req.headers, target);
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');

    serviceSocket.write(
      `${req.method} ${rewrittenUrl} HTTP/1.1\r\n` +
      `${headerLines}\r\n\r\n`,
    );

    if (head.length > 0) serviceSocket.write(head);

    // Tunnel bidireccional: cliente ↔ servicio
    serviceSocket.pipe(clientSocket, { end: true });
    clientSocket.pipe(serviceSocket, { end: true });
  });

  serviceSocket.on('error', (err) => {
    console.error(`[gateway] ws tunnel error → ${target.hostname}:${target.port} — ${err.message}`);
    clientSocket.destroy();
  });

  clientSocket.on('error', () => serviceSocket.destroy());
}
