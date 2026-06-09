import type { SubscriptionPlan, UiSubscriptionPlan } from '@/types/subscription'

export function toUiPlan(plan: SubscriptionPlan): UiSubscriptionPlan {
  return {
    id: plan.id,
    name: plan.nombre,
    description: plan.descripcion ?? 'Plan mensual para disfrutar Quetzal TV.',
    price: Number(plan.precio_base),
    currency: plan.moneda_base,
    interval: 'month',
    profileLimit: plan.perfiles_maximos,
    popular: plan.perfiles_maximos >= 4,
    features: [
      'Acceso al catalogo completo',
      `${plan.perfiles_maximos} perfil${plan.perfiles_maximos === 1 ? '' : 'es'} disponible${plan.perfiles_maximos === 1 ? '' : 's'}`,
      'Sin anuncios',
      plan.perfiles_maximos >= 4 ? 'Ideal para familia' : 'Configuracion sencilla',
    ],
  }
}
