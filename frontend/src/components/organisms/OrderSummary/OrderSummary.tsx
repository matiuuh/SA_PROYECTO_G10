import { Card } from '@/components/atoms'
import type { UiSubscriptionPlan } from '@/types/subscription'

interface OrderSummaryProps {
  plan: UiSubscriptionPlan
}

export function OrderSummary({ plan }: OrderSummaryProps) {
  const tax = plan.price * 0.16
  const total = plan.price + tax

  return (
    <Card className="p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-white mb-6">Resumen del pedido</h3>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-white font-medium">{plan.name}</div>
            <div className="text-sm text-[var(--color-denim-400)]">
              Hasta {plan.profileLimit} perfiles
            </div>
          </div>
          <div className="text-white font-medium">
            {plan.currency} {plan.price.toFixed(2)}
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">Subtotal</span>
            <span className="text-white">
              {plan.currency} {plan.price.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">IVA (16%)</span>
            <span className="text-white">
              {plan.currency} {tax.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] pt-4">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Total</span>
          <span className="text-2xl font-bold text-white">
            {plan.currency} {total.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-[var(--color-denim-400)] mt-2">
          Se cobrara {plan.currency} {total.toFixed(2)} hoy. Renovacion automatica cada mes.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-4">
        <p className="text-xs text-[var(--color-denim-200)]">
          Pago seguro. Despues de activar el plan podras crear perfiles segun el limite incluido.
        </p>
      </div>
    </Card>
  )
}
