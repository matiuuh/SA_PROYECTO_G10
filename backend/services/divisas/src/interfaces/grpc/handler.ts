import * as grpc from '@grpc/grpc-js';
import {
  obtenerTipoCambio,
  convertirMonto,
  listarMonedas,
} from '../../application/divisas-service';

// ─── Tipos locales que mapean los mensajes del proto ─────────────────────────

interface TipoCambioRequest {
  moneda_origen: string;
  moneda_destino: string;
}

interface ConvertirMontoRequest {
  monto: number;
  moneda_origen: string;
  moneda_destino: string;
}

// ─── Handlers gRPC ───────────────────────────────────────────────────────────

/**
 * RPC ObtenerTipoCambio
 */
export async function handleObtenerTipoCambio(
  call: grpc.ServerUnaryCall<TipoCambioRequest, unknown>,
  callback: grpc.sendUnaryData<unknown>
): Promise<void> {
  try {
    const { moneda_origen, moneda_destino } = call.request;

    if (!moneda_origen || !moneda_destino) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'moneda_origen y moneda_destino son requeridos',
      });
      return;
    }

    const resultado = await obtenerTipoCambio(moneda_origen, moneda_destino);

    callback(null, {
      moneda_origen: resultado.monedaOrigen,
      moneda_destino: resultado.monedaDestino,
      tasa: resultado.tasa,
      actualizado_en: resultado.actualizadoEn.toISOString(),
    });
  } catch (err) {
    console.error('[gRPC] ObtenerTipoCambio error:', (err as Error).message);
    callback({
      code: grpc.status.INTERNAL,
      message: (err as Error).message,
    });
  }
}

/**
 * RPC ConvertirMonto
 */
export async function handleConvertirMonto(
  call: grpc.ServerUnaryCall<ConvertirMontoRequest, unknown>,
  callback: grpc.sendUnaryData<unknown>
): Promise<void> {
  try {
    const { monto, moneda_origen, moneda_destino } = call.request;

    if (monto == null || !moneda_origen || !moneda_destino) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'monto, moneda_origen y moneda_destino son requeridos',
      });
      return;
    }

    if (monto < 0) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'monto no puede ser negativo',
      });
      return;
    }

    const resultado = await convertirMonto(monto, moneda_origen, moneda_destino);

    callback(null, {
      monto_original: resultado.montoOriginal,
      monto_convertido: resultado.montoConvertido,
      moneda_origen: resultado.monedaOrigen,
      moneda_destino: resultado.monedaDestino,
      tasa: resultado.tasa,
    });
  } catch (err) {
    console.error('[gRPC] ConvertirMonto error:', (err as Error).message);
    callback({
      code: grpc.status.INTERNAL,
      message: (err as Error).message,
    });
  }
}

/**
 * RPC ListarMonedas
 */
export async function handleListarMonedas(
  _call: grpc.ServerUnaryCall<unknown, unknown>,
  callback: grpc.sendUnaryData<unknown>
): Promise<void> {
  try {
    const monedas = await listarMonedas();
    callback(null, { monedas });
  } catch (err) {
    console.error('[gRPC] ListarMonedas error:', (err as Error).message);
    callback({
      code: grpc.status.INTERNAL,
      message: (err as Error).message,
    });
  }
}
