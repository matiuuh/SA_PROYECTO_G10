import http from 'http';
import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connectWithRetry } from './infrastructure/postgres';
import { notificacionesHandlers } from './interfaces/grpc/handler';
import {
  enviarConfirmacionRegistro,
  enviarRecibo,
  enviarAlertaPublicacion,
} from './application/service';

// ── Proto loading ──────────────────────────────────────────────────────────

const PROTO_PATH = path.resolve('/app/proto/notificaciones/v1/notificaciones.proto');

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
const NotificacionesService = grpcObject.notificaciones.v1
  .NotificacionesService as grpc.ServiceClientConstructor;

// ── Servidor HTTP ──────────────────────────────────────────────────────────

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

    // POST /api/v1/confirmacion-registro  body: {correo_destino, nombre_usuario}
    if (method === 'POST' && url === '/api/v1/confirmacion-registro') {
      try {
        const body = await readBody(req);
        const correo_destino = String(body['correo_destino'] ?? '');
        const nombre_usuario = String(body['nombre_usuario'] ?? '');
        if (!correo_destino) {
          writeJson(res, 400, { error: 'correo_destino es requerido' });
          return;
        }
        const result = await enviarConfirmacionRegistro(correo_destino, nombre_usuario);
        writeJson(res, result.enviado ? 200 : 500, {
          enviado: result.enviado,
          mensaje: result.enviado ? 'Correo de confirmacion enviado' : result.error_mensaje,
          notificacion_id: result.id,
        });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    // POST /api/v1/recibo
    if (method === 'POST' && url === '/api/v1/recibo') {
      try {
        const body = await readBody(req);
        const id_transaccion = String(body['id_transaccion'] ?? '');
        if (!id_transaccion) {
          writeJson(res, 400, { error: 'id_transaccion es requerido' });
          return;
        }
        const result = await enviarRecibo({
          correo_destino:  String(body['correo_destino'] ?? ''),
          nombre_usuario:  String(body['nombre_usuario'] ?? ''),
          id_transaccion,
          descripcion_plan: String(body['descripcion_plan'] ?? ''),
          monto:           Number(body['monto'] ?? 0),
          moneda:          String(body['moneda'] ?? ''),
          fecha:           String(body['fecha'] ?? ''),
        });
        writeJson(res, result.enviado ? 200 : 500, {
          enviado: result.enviado,
          mensaje: result.enviado ? 'Recibo enviado' : result.error_mensaje,
          notificacion_id: result.id,
        });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    // POST /api/v1/alerta-publicacion
    if (method === 'POST' && url === '/api/v1/alerta-publicacion') {
      try {
        const body = await readBody(req);
        const correos_destino = body['correos_destino'] as string[];
        if (!correos_destino || correos_destino.length === 0) {
          writeJson(res, 400, { error: 'correos_destino no puede estar vacío' });
          return;
        }
        const result = await enviarAlertaPublicacion({
          correos_destino,
          titulo_contenido: String(body['titulo_contenido'] ?? ''),
          tipo_contenido:   String(body['tipo_contenido'] ?? ''),
          descripcion:      String(body['descripcion'] ?? ''),
        });
        writeJson(res, result.enviado ? 200 : 500, {
          enviado: result.enviado,
          mensaje: result.enviado ? `Alerta enviada a ${correos_destino.length} destinatario(s)` : result.error_mensaje,
          notificacion_id: result.id,
        });
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message });
      }
      return;
    }

    writeJson(res, 404, { error: 'Ruta no encontrada' });
  });
}

// ── gRPC server ────────────────────────────────────────────────────────────

const PORT = process.env['GRPC_PORT'] ?? '5007';

async function main(): Promise<void> {
  await connectWithRetry();

  const server = new grpc.Server();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.addService((NotificacionesService as any).service, notificacionesHandlers);

  await new Promise<void>((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${PORT}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`[notificaciones] gRPC server listening on port ${boundPort}`);
        resolve();
      },
    );
  });

  // HTTP server (consumido por el API Gateway)
  const httpPort = parseInt(process.env['HTTP_PORT'] ?? '8007');
  const httpServer = createHttpServer();
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(httpPort, '0.0.0.0', () => {
      console.log(`[notificaciones] HTTP server listening on port ${httpPort}`);
      resolve();
    });
    httpServer.on('error', reject);
  });
}

main().catch((err) => {
  console.error('[notificaciones] fatal startup error:', err);
  process.exit(1);
});
