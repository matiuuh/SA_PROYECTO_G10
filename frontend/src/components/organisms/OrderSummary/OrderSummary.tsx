import { Card } from '@/components/atoms'
import type { UiPlanQuote, UiSubscriptionPlan } from '@/types/subscription'

interface OrderSummaryProps {
  plan: UiSubscriptionPlan
  quote?: UiPlanQuote | null
}

export function OrderSummary({ plan, quote = null }: OrderSummaryProps) {
  const baseTax = plan.price * 0.16
  const baseTotal = plan.price + baseTax
  const localSubtotal = quote?.conversionAvailable ? (quote.localAmount ?? null) : null
  const localTax = localSubtotal != null ? localSubtotal * 0.16 : null
  const localTotal = localSubtotal != null && localTax != null ? localSubtotal + localTax : null

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
            {quote?.conversionAvailable && localSubtotal != null && quote.localCurrency
              ? `${quote.localCurrency} ${localSubtotal.toFixed(2)}`
              : `${plan.currency} ${plan.price.toFixed(2)}`}
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">Subtotal</span>
            <span className="text-white">
              {quote?.conversionAvailable && localSubtotal != null && quote.localCurrency
                ? `${quote.localCurrency} ${localSubtotal.toFixed(2)}`
                : `${plan.currency} ${plan.price.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-denim-300)]">IVA (16%)</span>
            <span className="text-white">
              {quote?.conversionAvailable && localTax != null && quote.localCurrency
                ? `${quote.localCurrency} ${localTax.toFixed(2)}`
                : `${plan.currency} ${baseTax.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07] pt-4">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Total</span>
          <span className="text-2xl font-bold text-white">
            {quote?.conversionAvailable && localTotal != null && quote.localCurrency
              ? `${quote.localCurrency} ${localTotal.toFixed(2)}`
              : `${plan.currency} ${baseTotal.toFixed(2)}`}
          </span>
        </div>
        <p className="text-xs text-[var(--color-denim-400)] mt-2">
          {quote?.conversionAvailable && localTotal != null && quote.localCurrency
            ? `Se cobrara ${quote.localCurrency} ${localTotal.toFixed(2)} hoy. Renovacion automatica cada mes.`
            : `Se cobrara ${plan.currency} ${baseTotal.toFixed(2)} hoy. Renovacion automatica cada mes.`}
        </p>
      </div>

      {quote && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-xs ${
          quote.conversionAvailable
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
        }`}>
          <p>{quote.message}</p>
          {quote.conversionAvailable && quote.exchangeRate != null && quote.localCurrency && (
            <p className="mt-1">
              Tasa usada: 1 {quote.baseCurrency} = {quote.exchangeRate.toFixed(4)} {quote.localCurrency}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-4">
        <p className="text-xs text-[var(--color-denim-200)]">
          Pago seguro. Despues de activar el plan podras crear perfiles segun el limite incluido.
        </p>
      </div>
    </Card>
  )
}
