import { randomUUID } from 'crypto';
import { pool } from '../infrastructure/postgres';
import { convertirMontoDesdeBase } from '../infrastructure/divisas-client';
import { enviarReciboNotificacion } from '../infrastructure/notificaciones-client';
import type {
  Transaccion,
  Recibo,
  ProcesarPagoInput,
  ProcesarPagoResult,
  EstadoPago,
  TipoOperacion,
} from '../domain/payment';

// ── Helpers ────────────────────────────────────────────────────────────────

function rowToTransaccion(row: Record<string, unknown>): Transaccion {
  return {
    id: row['id'] as string,
    cuenta_id: row['cuenta_id'] as string,
    suscripcion_id: (row['suscripcion_id'] as string | null) ?? null,
    plan_id: row['plan_id'] as string,
    tipo_operacion: row['tipo_operacion'] as TipoOperacion,
    monto_base: parseFloat(row['monto_base'] as string),
    monto_local: parseFloat(row['monto_local'] as string),
    moneda_local: row['moneda_local'] as string,
    estado: row['estado'] as EstadoPago,
    referencia_pasarela: (row['referencia_pasarela'] as string | null) ?? null,
    pagado_en: row['pagado_en'] ? new Date(row['pagado_en'] as string) : null,
    creado_en: new Date(row['creado_en'] as string),
    actualizado_en: new Date(row['actualizado_en'] as string),
  };
}

function rowToRecibo(row: Record<string, unknown>): Recibo {
  return {
    id: row['id'] as string,
    transaccion_id: row['transaccion_id'] as string,
    numero_recibo: row['numero_recibo'] as string,
    correo_destino: row['correo_destino'] as string,
    enviado: row['enviado'] as boolean,
    enviado_en: row['enviado_en'] ? new Date(row['enviado_en'] as string) : null,
    creado_en: new Date(row['creado_en'] as string),
  };
}

// ── Service ────────────────────────────────────────────────────────────────

/**
 * procesarPago
 *
 * Fase 1 — pago simulado:
 *  - El estado siempre resulta APROBADO.
 *  - La referencia de pasarela tiene el formato SIM-{uuid}.
 *  - monto_local = monto_base (integración con Divisas queda pendiente).
 *  - Llama al stored procedure sp_registrar_compra que inserta la transacción
 *    y, si está aprobada, el recibo correspondiente.
 */
export async function procesarPago(input: ProcesarPagoInput): Promise<ProcesarPagoResult> {
  const referencia = `SIM-${randomUUID()}`;
  const estado: EstadoPago = 'aprobado';
  // Fase 1: sin conversión real, monto_local = monto_base
  const montoLocal = await convertirMontoDesdeBase(input.monto_base, input.moneda_local);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `CALL sp_registrar_compra($1, $2, $3, $4::tipo_operacion_pago, $5, $6, $7, $8::estado_pago, $9, $10)`,
      [
        input.cuenta_id,
        input.suscripcion_id,
        input.plan_id,
        input.tipo_operacion,
        input.monto_base,
        montoLocal,
        input.moneda_local,
        estado,
        referencia,
        input.correo_destino,
      ],
    );

    await client.query('COMMIT');

    // Recuperar la transacción recién creada por referencia de pasarela (única)
    const txRes = await client.query<Record<string, unknown>>(
      `SELECT * FROM transacciones WHERE referencia_pasarela = $1 LIMIT 1`,
      [referencia],
    );

    if (txRes.rowCount === 0) {
      throw new Error('transaccion no encontrada tras sp_registrar_compra');
    }

    const transaccion = rowToTransaccion(txRes.rows[0]);

    // Si aprobada, recuperar el recibo generado
    let recibo: Recibo | null = null;
    if (transaccion.estado === 'aprobado') {
      const recRes = await client.query<Record<string, unknown>>(
        `SELECT * FROM recibos WHERE transaccion_id = $1 LIMIT 1`,
        [transaccion.id],
      );
      if (recRes.rowCount && recRes.rowCount > 0) {
        recibo = rowToRecibo(recRes.rows[0]);
      }
    }

    if (recibo) {
      try {
        await enviarReciboNotificacion({
          correo_destino: recibo.correo_destino,
          nombre_usuario: input.nombre_usuario,
          id_transaccion: transaccion.id,
          descripcion_plan:
            input.descripcion_plan?.trim() || `Plan ${transaccion.plan_id}`,
          monto: transaccion.monto_local,
          moneda: transaccion.moneda_local,
          fecha: (transaccion.pagado_en ?? transaccion.creado_en).toISOString(),
        });
        await client.query(
          `UPDATE recibos
             SET enviado = TRUE,
                 enviado_en = NOW()
           WHERE id = $1`,
          [recibo.id],
        );
        recibo.enviado = true;
        recibo.enviado_en = new Date();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[cobros] no se pudo enviar notificacion de recibo:', msg);
        await client.query(
          `UPDATE recibos
             SET enviado = FALSE,
                 enviado_en = NULL
           WHERE id = $1`,
          [recibo.id],
        );
        recibo.enviado = false;
        recibo.enviado_en = null;
      }
    }

    return { transaccion, recibo };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function obtenerTransaccion(id: string): Promise<Transaccion> {
  const res = await pool.query<Record<string, unknown>>(
    `SELECT * FROM transacciones WHERE id = $1`,
    [id],
  );
  if (res.rowCount === 0) {
    throw new Error(`transaccion ${id} no encontrada`);
  }
  return rowToTransaccion(res.rows[0]);
}

export async function listarTransacciones(cuentaId: string): Promise<Transaccion[]> {
  const res = await pool.query<Record<string, unknown>>(
    `SELECT * FROM transacciones WHERE cuenta_id = $1 ORDER BY creado_en DESC`,
    [cuentaId],
  );
  return res.rows.map(rowToTransaccion);
}

export async function obtenerRecibo(transaccionId: string): Promise<Recibo> {
  const res = await pool.query<Record<string, unknown>>(
    `SELECT * FROM recibos WHERE transaccion_id = $1`,
    [transaccionId],
  );
  if (res.rowCount === 0) {
    throw new Error(`recibo para transaccion ${transaccionId} no encontrado`);
  }
  return rowToRecibo(res.rows[0]);
}
