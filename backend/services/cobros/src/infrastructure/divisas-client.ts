import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = path.resolve('/app/proto/divisas/v1/divisas.proto');
const DIVISAS_GRPC_TARGET = process.env['DIVISAS_GRPC_TARGET'] ?? 'divisas-service:5005';
const BASE_CURRENCY = (process.env['BASE_CURRENCY'] ?? 'USD').toUpperCase();

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
const DivisasService = grpcObject.divisas.v1.DivisasService as grpc.ServiceClientConstructor;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DivisasClient = any;

function createClient(): DivisasClient {
  return new DivisasService(DIVISAS_GRPC_TARGET, grpc.credentials.createInsecure());
}

export async function convertirMontoDesdeBase(
  montoBase: number,
  monedaDestino: string,
): Promise<number> {
  const destino = monedaDestino.toUpperCase();

  if (destino === BASE_CURRENCY) {
    return montoBase;
  }

  const client = createClient();

  return await new Promise<number>((resolve, reject) => {
    client.ConvertirMonto(
      {
        monto: montoBase,
        moneda_origen: BASE_CURRENCY,
        moneda_destino: destino,
      },
      (err: grpc.ServiceError | null, response?: { monto_convertido?: number }) => {
        client.close();

        if (err) {
          reject(new Error(`no se pudo convertir monto con divisas: ${err.message}`));
          return;
        }

        if (!response || response.monto_convertido == null) {
          reject(new Error('divisas no devolvio monto_convertido'));
          return;
        }

        resolve(response.monto_convertido);
      },
    );
  });
}
