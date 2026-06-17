import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { status as grpcStatus } from '@grpc/grpc-js';
import {
  enviarConfirmacionRegistro,
  enviarRecibo,
  enviarAlertaPublicacion,
} from '../../application/service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCall = ServerUnaryCall<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCallback = sendUnaryData<any>;

function grpcError(callback: AnyCallback, code: number, message: string): void {
  callback({ code, message }, null);
}

// ── RPC handlers ───────────────────────────────────────────────────────────

async function handleEnviarConfirmacionRegistro(
  call: AnyCall,
  callback: AnyCallback,
): Promise<void> {
  try {
    const req = call.request as { correo_destino: string; nombre_usuario: string };
    if (!req.correo_destino) {
      grpcError(callback, grpcStatus.INVALID_ARGUMENT, 'correo_destino es requerido');
      return;
    }
    const result = await enviarConfirmacionRegistro(req.correo_destino, req.nombre_usuario);
    callback(null, {
      enviado: result.enviado,
      mensaje: result.enviado ? 'Correo de confirmacion enviado' : `Envio fallido: ${result.error_mensaje ?? 'error desconocido'}`,
      notificacion_id: result.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handler] EnviarConfirmacionRegistro error:', msg);
    grpcError(callback, grpcStatus.INTERNAL, msg);
  }
}

async function handleEnviarRecibo(call: AnyCall, callback: AnyCallback): Promise<void> {
  try {
    const req = call.request as {
      correo_destino: string;
      nombre_usuario: string;
      id_transaccion: string;
      descripcion_plan: string;
      monto: number;
      moneda: string;
      fecha: string;
    };
    if (!req.id_transaccion) {
      grpcError(callback, grpcStatus.INVALID_ARGUMENT, 'id_transaccion es requerido');
      return;
    }
    const result = await enviarRecibo(req);
    callback(null, {
      enviado: result.enviado,
      mensaje: result.enviado ? 'Recibo enviado' : `Envio fallido: ${result.error_mensaje ?? 'error desconocido'}`,
      notificacion_id: result.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handler] EnviarRecibo error:', msg);
    grpcError(callback, grpcStatus.INTERNAL, msg);
  }
}

async function handleEnviarAlertaNuevaPublicacion(
  call: AnyCall,
  callback: AnyCallback,
): Promise<void> {
  try {
    const req = call.request as {
      correos_destino: string[];
      titulo_contenido: string;
      tipo_contenido: string;
      descripcion: string;
    };
    if (!req.correos_destino || req.correos_destino.length === 0) {
      grpcError(callback, grpcStatus.INVALID_ARGUMENT, 'correos_destino no puede estar vacío');
      return;
    }
    const result = await enviarAlertaPublicacion(req);
    callback(null, {
      enviado: result.enviado,
      mensaje: result.enviado
        ? `Alerta enviada a ${req.correos_destino.length} destinatario(s)`
        : `Envio fallido: ${result.error_mensaje ?? 'error desconocido'}`,
      notificacion_id: result.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handler] EnviarAlertaNuevaPublicacion error:', msg);
    grpcError(callback, grpcStatus.INTERNAL, msg);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const notificacionesHandlers: Record<string, any> = {
  EnviarConfirmacionRegistro: handleEnviarConfirmacionRegistro,
  EnviarRecibo: handleEnviarRecibo,
  EnviarAlertaNuevaPublicacion: handleEnviarAlertaNuevaPublicacion,
};
