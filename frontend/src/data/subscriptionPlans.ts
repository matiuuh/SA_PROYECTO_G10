import type { SubscriptionPlan } from '@/types/subscription'

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 9.99,
    interval: 'month',
    features: [
      'Acceso a catálogo completo',
      'Calidad HD',
      '1 dispositivo simultáneo',
      'Sin anuncios',
    ],
  },
  {
    id: 'standard',
    name: 'Estándar',
    price: 14.99,
    interval: 'month',
    popular: true,
    features: [
      'Todo lo del plan Básico',
      'Calidad Full HD',
      '2 dispositivos simultáneos',
      'Descargas offline',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    interval: 'month',
    features: [
      'Todo lo del plan Estándar',
      'Calidad 4K + HDR',
      '4 dispositivos simultáneos',
      'Audio espacial',
    ],
  },
]
