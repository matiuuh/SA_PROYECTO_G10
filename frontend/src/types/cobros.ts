export type PaymentOperationType = 'contratacion' | 'modificacion_plan'

export interface ProcessPaymentPayload {
  cuenta_id: string
  suscripcion_id?: string | null
  plan_id: string
  tipo_operacion: PaymentOperationType
  monto_base: number
  moneda_local: string
  correo_destino: string
  nombre_usuario?: string
  descripcion_plan?: string
}

export interface PaymentTransaction {
  id: string
  cuenta_id: string
  suscripcion_id: string | null
  plan_id: string
  tipo_operacion: PaymentOperationType
  monto_base: number
  monto_local: number
  moneda_local: string
  estado: string
  referencia_pasarela: string | null
  pagado_en: string | null
  creado_en: string
  actualizado_en: string
}

export interface PaymentReceipt {
  id: string
  transaccion_id: string
  numero_recibo: string
  correo_destino: string
  enviado: boolean
  enviado_en: string | null
  creado_en: string
}

export interface ProcessPaymentResponse {
  transaccion: PaymentTransaction
  recibo: PaymentReceipt | null
}
