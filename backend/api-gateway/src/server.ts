import http from 'http';
import net from 'net';
import { config } from './config';
import { isPublic, verifyToken } from './auth';
import { proxyTo, proxyUpgrade, rewriteUrl } from './proxy';

// ── Tabla de rutas: prefijo → servicio destino ─────────────────────────────
const ROUTES: Array<{ prefix: string; target: keyof typeof config.services }> = [
  { prefix: '/api/usuario',        target: 'usuario' },
  { prefix: '/api/suscripcion',    target: 'suscripcion' },
  { prefix: '/api/catalogo',       target: 'catalogo' },
  { prefix: '/api/streaming',      target: 'streaming' },
  { prefix: '/api/cobros',         target: 'cobros' },
  { prefix: '/api/divisas',        target: 'divisas' },
  { prefix: '/api/notificaciones', target: 'notificaciones' },
];

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body));
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url    = req.url ?? '/';
  const method = req.method ?? 'GET';

  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  // ── Health del gateway ────────────────────────────────────────────────────
  if (method === 'GET' && url === '/health') {
    writeJson(res, 200, { status: 'ok', service: 'api-gateway' });
    return;
  }

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // ── Verificación JWT (rutas protegidas) ───────────────────────────────────
  if (url.startsWith('/api/') && !isPublic(method, url)) {
    if (!verifyToken(req, res)) return;
  }

  // ── Enrutamiento a microservicios ─────────────────────────────────────────
  const route = ROUTES.find(r => url.startsWith(r.prefix));
  if (route) {
    const target  = config.services[route.target];
    const newUrl  = rewriteUrl(url, route.prefix);
    proxyTo(req, res, target, newUrl);
    return;
  }

  // ── Frontend (todo lo que no sea /api/*) ──────────────────────────────────
  if (config.FRONTEND_URL) {
    const frontendTarget = new URL(config.FRONTEND_URL);
    proxyTo(req, res, {
      hostname: frontendTarget.hostname,
      port: parseInt(frontendTarget.port || '80'),
    }, url);
    return;
  }

  writeJson(res, 404, { error: 'Ruta no encontrada' });
}

function main(): void {
  if (!config.JWT_SECRET) {
    console.error('[gateway] JWT_SECRET no configurado — abortando');
    process.exit(1);
  }

  const server = http.createServer(handleRequest);

  // Manejo de upgrades WebSocket.
  // Node.js emite 'upgrade' en lugar de 'request' cuando llega
  // Connection: Upgrade + Upgrade: websocket — si no se escucha este
  // evento, el socket se cierra y el WebSocket falla silenciosamente.
  server.on('upgrade', (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    const url = req.url ?? '/';
    console.log(`[${new Date().toISOString()}] WS UPGRADE ${url}`);

    const route = ROUTES.find(r => url.startsWith(r.prefix));
    if (route) {
      const target     = config.services[route.target];
      const rewrittenUrl = rewriteUrl(url, route.prefix);
      proxyUpgrade(req, socket, head, target, rewrittenUrl);
      return;
    }

    // WebSocket sin ruta conocida → cerrar conexión limpiamente
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  });

  server.listen(config.PORT, '0.0.0.0', () => {
    console.log(`[gateway] escuchando en puerto ${config.PORT}`);
    console.log('[gateway] servicios configurados:');
    for (const route of ROUTES) {
      const t = config.services[route.target];
      console.log(`  ${route.prefix}/* → ${t.hostname}:${t.port}`);
    }
    if (config.FRONTEND_URL) {
      console.log(`  /*              → ${config.FRONTEND_URL}`);
    }
  });

  server.on('error', (err) => {
    console.error('[gateway] error fatal:', err);
    process.exit(1);
  });
}

main();
