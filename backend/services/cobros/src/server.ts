import path from 'path';
import http from 'http';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connectWithRetry } from './infrastructure/postgres';
import { procesarPago } from './application/cobros-service';
import { cobrosHandlers } from './interfaces/grpc/handler';

// ── Proto loading ──────────────────────────────────────────────────────────

const PROTO_PATH = path.resolve('/app/proto/cobros/v1/cobros.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: ['/app/proto'],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grpcObject = grpc.loadPackageDefinition(packageDef) as any;
const CobrosService = grpcObject.cobros.v1.CobrosService as grpc.ServiceClientConstructor;

// ── gRPC server ────────────────────────────────────────────────────────────

const PORT = process.env['GRPC_PORT'] ?? '5006';
const HTTP_PORT = Number(process.env['HTTP_PORT'] ?? '8006');

function setCommonHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
}

function writeJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  setCommonHeaders(res);
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function createHttpServer(): http.Server {
  return http.createServer(async (req, res) => {
    if (!req.url) {
      writeJson(res, 404, { detail: 'Ruta no encontrada.' });
      return;
    }

    if (req.method === 'OPTIONS') {
      setCommonHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && parsedUrl.pathname === '/health') {
      writeJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/api/v1/payments/process') {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const rawBody = Buffer.concat(chunks).toString('utf-8');
        const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};

        const cuentaId = String(body['cuenta_id'] ?? '').trim();
        const planId = String(body['plan_id'] ?? '').trim();
        const tipoOperacion = String(body['tipo_operacion'] ?? '').trim();
        const monedaLocal = String(body['moneda_local'] ?? '').trim();
        const correoDestino = String(body['correo_destino'] ?? '').trim();
        const nombreUsuario = String(body['nombre_usuario'] ?? '').trim();
        const descripcionPlan = String(body['descripcion_plan'] ?? '').trim();
        const suscripcionIdRaw = String(body['suscripcion_id'] ?? '').trim();
        const montoBase = Number(body['monto_base'] ?? 0);

        if (!cuentaId || !planId || !tipoOperacion || !monedaLocal || !Number.isFinite(montoBase) || montoBase <= 0) {
          writeJson(res, 400, { detail: 'Los campos cuenta_id, plan_id, tipo_operacion, monto_base y moneda_local son obligatorios.' });
          return;
        }
        if (tipoOperacion !== 'contratacion' && tipoOperacion !== 'modificacion_plan') {
          writeJson(res, 400, { detail: 'tipo_operacion invalido.' });
          return;
        }

        const result = await procesarPago({
          cuenta_id: cuentaId,
          suscripcion_id: suscripcionIdRaw || null,
          plan_id: planId,
          tipo_operacion: tipoOperacion,
          monto_base: montoBase,
          moneda_local: monedaLocal,
          correo_destino: correoDestino,
          nombre_usuario: nombreUsuario || undefined,
          descripcion_plan: descripcionPlan || undefined,
        });

        writeJson(res, 200, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo procesar el pago.';
        writeJson(res, 500, { detail: message });
      }
      return;
    }

    writeJson(res, 404, { detail: 'Ruta no encontrada.' });
  });
}

async function main(): Promise<void> {
  // 1. Ensure database is reachable before accepting traffic
  await connectWithRetry();

  // 2. Build and start gRPC server
  const server = new grpc.Server();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.addService((CobrosService as any).service, cobrosHandlers);

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`[cobros] gRPC server listening on port ${boundPort}`);
        resolve();
      },
    );
  });

  const httpServer = createHttpServer();
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`[cobros] HTTP server listening on port ${HTTP_PORT}`);
      resolve();
    });
    httpServer.on('error', reject);
  });
}

main().catch((err) => {
  console.error('[cobros] fatal startup error:', err);
  process.exit(1);
});
