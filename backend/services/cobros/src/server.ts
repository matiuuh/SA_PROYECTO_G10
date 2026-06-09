import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { connectWithRetry } from './infrastructure/postgres';
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
}

main().catch((err) => {
  console.error('[cobros] fatal startup error:', err);
  process.exit(1);
});
