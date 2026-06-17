import http from 'http';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

import { connectRedis, disconnectRedis } from './infrastructure/redis';
import { createPool, closePool } from './infrastructure/postgres';
import {
  handleObtenerTipoCambio,
  handleConvertirMonto,
  handleListarMonedas,
} from './interfaces/grpc/handler';
import {
  obtenerTipoCambio,
  convertirMonto,
  listarMonedas,
} from './application/divisas-service';

// ─── Carga del proto en runtime (sin protoc) ─────────────────────────────────

// In the container: dist/server.js → __dirname = /app/dist
// Proto is at       /app/proto/divisas/v1/divisas.proto
// ../proto resolves correctly from dist/ to /app/proto
const PROTO_PATH = path.resolve(__dirname, '../proto/divisas/v1/divisas.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const divisasService = protoDescriptor.divisas.v1.DivisasService;

// ─── Servidor gRPC ────────────────────────────────────────────────────────────

function createServer(): grpc.Server {
  const server = new grpc.Server();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.addService(divisasService.service, {
    ObtenerTipoCambio: handleObtenerTipoCambio,
    ConvertirMonto: handleConvertirMonto,
    ListarMonedas: handleListarMonedas,
  } as any);

  return server;
}

// ─── Servidor HTTP ────────────────────────────────────────────────────────────

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? (JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function createHttpServer(): http.Server {
  return http.createServer(async (req, res) => {
    const url    = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
      res.end();
      return;
    }

    if (method === 'GET' && url === '/health') {
      writeJson(res, 200, { status: 'ok' });
      return;
    }

    // GET /api/v1/tipo-cambio?moneda_origen=USD&moneda_destino=GTQ
    if (method === 'GET' && url.startsWith('/api/v1/tipo-cambio')) {
      try {
        const params = new URL(url, 'http://x').searchParams;
        const moneda_origen  = params.get('moneda_origen') ?? '';
        const moneda_destino = params.get('moneda_destino') ?? '';
        if (!moneda_origen || !moneda_destino) {
          writeJson(res, 400, { error: 'moneda_origen y moneda_destino son requeridos' });
          return;
        }
        const result = await obtenerTipoCambio(moneda_origen, moneda_destino);
        writeJson(res, 200, {
          moneda_origen: result.monedaOrigen,
          moneda_destino: result.monedaDestino,
          tasa: result.tasa,
          actualizado_en: result.actualizadoEn.toISOString(),
        });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    // POST /api/v1/convertir  body: {monto, moneda_origen, moneda_destino}
    if (method === 'POST' && url === '/api/v1/convertir') {
      try {
        const body = await readBody(req);
        const monto          = Number(body['monto']);
        const moneda_origen  = String(body['moneda_origen'] ?? '');
        const moneda_destino = String(body['moneda_destino'] ?? '');
        if (isNaN(monto) || !moneda_origen || !moneda_destino) {
          writeJson(res, 400, { error: 'monto, moneda_origen y moneda_destino son requeridos' });
          return;
        }
        const result = await convertirMonto(monto, moneda_origen, moneda_destino);
        writeJson(res, 200, {
          monto_original:  result.montoOriginal,
          monto_convertido: result.montoConvertido,
          moneda_origen:   result.monedaOrigen,
          moneda_destino:  result.monedaDestino,
          tasa:            result.tasa,
        });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    // GET /api/v1/monedas
    if (method === 'GET' && url === '/api/v1/monedas') {
      try {
        const monedas = await listarMonedas();
        writeJson(res, 200, { monedas });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    writeJson(res, 404, { error: 'Ruta no encontrada' });
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Inicializar dependencias
  await connectRedis();
  createPool();

  const port = process.env.GRPC_PORT ?? '5005';
  const address = `0.0.0.0:${port}`;

  const server = createServer();

  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('[gRPC] Error al vincular servidor:', err.message);
      process.exit(1);
    }
    console.log(`[gRPC] Servidor Divisas escuchando en ${address} (puerto ${boundPort})`);
  });

  // HTTP server (consumido por el API Gateway)
  const httpPort = parseInt(process.env['HTTP_PORT'] ?? '8005');
  const httpServer = createHttpServer();
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(httpPort, '0.0.0.0', () => {
      console.log(`[HTTP] Servidor Divisas escuchando en puerto ${httpPort}`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Server] Señal ${signal} recibida — apagando...`);
    server.tryShutdown(async () => {
      await disconnectRedis();
      await closePool();
      console.log('[Server] Apagado limpio completado');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: Error) => {
  console.error('[Server] Error fatal en arranque:', err.message);
  process.exit(1);
});
