export type PlanTier = 'basic' | 'standard' | 'premium'

export interface SubscriptionPlan {
  id: PlanTier
  name: string
  price: number
  interval: 'month'
  features: string[]
  popular?: boolean
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
  planId: PlanTier
  planName: string
  amount: number
  date: string
  status: 'completed' | 'pending' | 'failed'
}
