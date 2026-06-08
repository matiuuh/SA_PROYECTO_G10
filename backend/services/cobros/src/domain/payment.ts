// ── Domain types for the Cobros service ───────────────────────────────────

export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';
export type TipoOperacion = 'contratacion' | 'modificacion_plan';

export interface Transaccion {
  id: string;
  cuenta_id: string;
  suscripcion_id: string | null;
  plan_id: string;
  tipo_operacion: TipoOperacion;
  monto_base: number;
  monto_local: number;
  moneda_local: string;
  estado: EstadoPago;
  referencia_pasarela: string | null;
  pagado_en: Date | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface Recibo {
  id: string;
  transaccion_id: string;
  numero_recibo: string;
  correo_destino: string;
  enviado: boolean;
  enviado_en: Date | null;
  creado_en: Date;
}

export interface ProcesarPagoInput {
  cuenta_id: string;
  plan_id: string;
  tipo_operacion: TipoOperacion;
  monto_base: number;
  moneda_local: string;
  correo_destino: string;
}

export interface ProcesarPagoResult {
  transaccion: Transaccion;
  recibo: Recibo | null;
}
