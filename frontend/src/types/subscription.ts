export interface SubscriptionPlan {
  id: string
  nombre: string
  descripcion?: string | null
  precio_base: string
  moneda_base: string
  perfiles_maximos: number
  activo: boolean
  creado_en: string
  actualizado_en: string
}

export interface UiSubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month'
  profileLimit: number
  features: string[]
  popular?: boolean
}

export interface SubscriptionRecord {
  id: string
  cuenta_id: string
  plan_id: string
  estado: string
  fecha_inicio: string | null
  fecha_fin: string | null
  creado_en: string
  actualizado_en: string
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal'
  label: string
  icon: string
}

export interface CheckoutFormData {
  email: string
  cardNumber: string
  cardName: string
  expiryDate: string
  cvv: string
  paymentMethod: string
}

export interface Order {
  id: string
  planId: string
  planName: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
}
