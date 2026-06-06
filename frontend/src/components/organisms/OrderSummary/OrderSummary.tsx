import { Card } from '@/components/atoms'
import type { SubscriptionPlan } from '@/types/subscription'

interface OrderSummaryProps {
  plan: SubscriptionPlan
}

export function OrderSummary({ plan }: OrderSummaryProps) {
  const tax = plan.price * 0.16
  const total = plan.price + tax

  return (
    <Card className="p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-white mb-6">Resumen del pedido</h3>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-white font-medium">{plan.name}</div>
            <div className="text-sm text-[var(--color-denim-400)]">
              Plan mensual
            </div>
          </div>
          <div className="text-white font-medium">${plan.price.toFixed(2)}</div>
        </div>

        <div className="border-t border-white/[0.07] pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">Subtotal</span>
            <span className="text-white">${plan.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">IVA (16%)</span>
            <span className="text-white">${tax.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] pt-4">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Total</span>
          <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-[var(--color-denim-400)] mt-2">
          Se cobrará ${total.toFixed(2)} hoy. Renovación automática cada mes.
        </p>
      </div>

      <div className="mt-6 p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg">
        <p className="text-xs text-[var(--color-denim-200)]">
          Pago seguro y encriptado. Puedes cancelar en cualquier momento.
        </p>
      </div>
    </Card>
  )
}
