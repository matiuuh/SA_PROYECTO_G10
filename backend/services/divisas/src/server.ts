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
