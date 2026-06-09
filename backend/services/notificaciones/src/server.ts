import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connectWithRetry } from './infrastructure/postgres';
import { notificacionesHandlers } from './interfaces/grpc/handler';

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
}

main().catch((err) => {
  console.error('[notificaciones] fatal startup error:', err);
  process.exit(1);
});
