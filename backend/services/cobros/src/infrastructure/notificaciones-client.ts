import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const PROTO_PATH = path.resolve('/app/proto/notificaciones/v1/notificaciones.proto');
const NOTIFICACIONES_GRPC_TARGET =
  process.env['NOTIFICACIONES_GRPC_TARGET'] ?? 'notificaciones-service:5007';
const DEFAULT_USER_NAME = process.env['DEFAULT_NOTIFICATION_USER_NAME'] ?? 'Usuario';

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
const NotificacionesService =
  grpcObject.notificaciones.v1.NotificacionesService as grpc.ServiceClientConstructor;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotificacionesClient = any;

function createClient(): NotificacionesClient {
  return new NotificacionesService(
    NOTIFICACIONES_GRPC_TARGET,
    grpc.credentials.createInsecure(),
  );
}

export async function enviarReciboNotificacion(opts: {
  correo_destino: string;
  id_transaccion: string;
  descripcion_plan: string;
  monto: number;
  moneda: string;
  fecha: string;
  nombre_usuario?: string;
}): Promise<void> {
  const client = createClient();

  await new Promise<void>((resolve, reject) => {
    client.EnviarRecibo(
      {
        correo_destino: opts.correo_destino,
        nombre_usuario: opts.nombre_usuario ?? DEFAULT_USER_NAME,
        id_transaccion: opts.id_transaccion,
        descripcion_plan: opts.descripcion_plan,
        monto: opts.monto,
        moneda: opts.moneda,
        fecha: opts.fecha,
      },
      (
        err: grpc.ServiceError | null,
        response?: { enviado?: boolean; mensaje?: string },
      ) => {
        client.close();

        if (err) {
          reject(new Error(`no se pudo enviar recibo con notificaciones: ${err.message}`));
          return;
        }

        if (!response?.enviado) {
          reject(
            new Error(
              `notificaciones reporto fallo al enviar recibo: ${response?.mensaje ?? 'sin detalle'}`,
            ),
          );
          return;
        }

        resolve();
      },
    );
  });
}
