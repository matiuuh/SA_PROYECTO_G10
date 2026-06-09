import type { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import { status as grpcStatus } from '@grpc/grpc-js';
import {
  procesarPago,
  obtenerTransaccion,
  listarTransacciones,
  obtenerRecibo,
} from '../../application/cobros-service';
import type { Transaccion, Recibo, TipoOperacion, EstadoPago } from '../../domain/payment';

// ── gRPC proto-loader produces plain JS objects, so we type them loosely ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCall = ServerUnaryCall<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCallback = sendUnaryData<any>;

// ── Converters: domain → protobuf wire format ──────────────────────────────

const ESTADO_MAP: Record<EstadoPago, number> = {
  pendiente: 0,
  aprobado: 1,
  rechazado: 2,
  cancelado: 3,
};

const TIPO_OP_MAP: Record<TipoOperacion, number> = {
  contratacion: 0,
  modificacion_plan: 1,
};

// proto-loader con enums:String envía strings ("CONTRATACION"); con enums:Number envía enteros
const TIPO_OP_REVERSE: Record<string | number, TipoOperacion> = {
  0: 'contratacion',
  1: 'modificacion_plan',
  CONTRATACION: 'contratacion',
  MODIFICACION_PLAN: 'modificacion_plan',
};

function toTimestamp(date: Date | null): { seconds: number; nanos: number } | null {
  if (!date) return null;
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanos: (date.getTime() % 1000) * 1_000_000,
  };
}

function transaccionToProto(t: Transaccion): Record<string, unknown> {
  return {
    id: t.id,
    cuenta_id: t.cuenta_id,
    suscripcion_id: t.suscripcion_id ?? '',
    plan_id: t.plan_id,
    tipo_operacion: TIPO_OP_MAP[t.tipo_operacion],
    monto_base: t.monto_base,
    monto_local: t.monto_local,
    moneda_local: t.moneda_local,
    estado: ESTADO_MAP[t.estado],
    referencia_pasarela: t.referencia_pasarela ?? '',
    pagado_en: toTimestamp(t.pagado_en),
    creado_en: toTimestamp(t.creado_en),
  };
}

function reciboToProto(r: Recibo): Record<string, unknown> {
  return {
    id: r.id,
    transaccion_id: r.transaccion_id,
    numero_recibo: r.numero_recibo,
    correo_destino: r.correo_destino,
    enviado: r.enviado,
    enviado_en: toTimestamp(r.enviado_en),
    creado_en: toTimestamp(r.creado_en),
  };
}

function grpcError(call: AnyCallback, code: number, message: string): void {
  call({ code, message }, null);
}

// ── RPC handlers ───────────────────────────────────────────────────────────

async function handleProcesarPago(call: AnyCall, callback: AnyCallback): Promise<void> {
  try {
    const req = call.request as {
      cuenta_id: string;
      suscripcion_id?: string;
      plan_id: string;
      tipo_operacion: number;
      monto_base: number;
      moneda_local: string;
      correo_destino: string;
    };

    const tipoOp = TIPO_OP_REVERSE[req.tipo_operacion];
    if (!tipoOp) {
      grpcError(callback, grpcStatus.INVALID_ARGUMENT, 'tipo_operacion inválido');
      return;
    }

    const result = await procesarPago({
      cuenta_id: req.cuenta_id,
      suscripcion_id: req.suscripcion_id && req.suscripcion_id.length > 0 ? req.suscripcion_id : null,
      plan_id: req.plan_id,
      tipo_operacion: tipoOp,
      monto_base: req.monto_base,
      moneda_local: req.moneda_local,
      correo_destino: req.correo_destino,
    });

    callback(null, {
      transaccion: transaccionToProto(result.transaccion),
      recibo: result.recibo ? reciboToProto(result.recibo) : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handler] ProcesarPago error:', msg);
    grpcError(callback, grpcStatus.INTERNAL, msg);
  }
}

async function handleObtenerTransaccion(call: AnyCall, callback: AnyCallback): Promise<void> {
  try {
    const req = call.request as { id: string };
    const tx = await obtenerTransaccion(req.id);
    callback(null, transaccionToProto(tx));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('no encontrada')) {
      grpcError(callback, grpcStatus.NOT_FOUND, msg);
    } else {
      grpcError(callback, grpcStatus.INTERNAL, msg);
    }
  }
}

async function handleListarTransacciones(call: AnyCall, callback: AnyCallback): Promise<void> {
  try {
    const req = call.request as { cuenta_id: string };
    const txList = await listarTransacciones(req.cuenta_id);
    callback(null, { transacciones: txList.map(transaccionToProto) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    grpcError(callback, grpcStatus.INTERNAL, msg);
  }
}

async function handleObtenerRecibo(call: AnyCall, callback: AnyCallback): Promise<void> {
  try {
    const req = call.request as { transaccion_id: string };
    const recibo = await obtenerRecibo(req.transaccion_id);
    callback(null, reciboToProto(recibo));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('no encontrado')) {
      grpcError(callback, grpcStatus.NOT_FOUND, msg);
    } else {
      grpcError(callback, grpcStatus.INTERNAL, msg);
    }
  }
}

// ── Exported handler map (matches proto service definition) ───────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cobrosHandlers: Record<string, any> = {
  ProcesarPago: handleProcesarPago,
  ObtenerTransaccion: handleObtenerTransaccion,
  ListarTransacciones: handleListarTransacciones,
  ObtenerRecibo: handleObtenerRecibo,
};
