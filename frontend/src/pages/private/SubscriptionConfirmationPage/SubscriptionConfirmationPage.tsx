import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/atoms'
import { PurchaseReceipt } from '@/components/organisms'
import { listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { UiSubscriptionPlan } from '@/types/subscription'

export function SubscriptionConfirmationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const subscriptionId = searchParams.get('subscription')
  const planId = searchParams.get('plan') ?? ''
  const transactionId = searchParams.get('transaction') ?? ''
  const receiptStatus = searchParams.get('receipt') ?? ''

  const [plans, setPlans] = useState<UiSubscriptionPlan[]>([])

  useEffect(() => {
    if (!subscriptionId) {
      navigate('/subscription/plans', { replace: true })
      return
    }

    async function loadPlans() {
      const data = await listActivePlans()
      setPlans(data.map(toUiPlan))
    }

    void loadPlans()
  }, [subscriptionId, navigate])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === planId) ?? null,
    [plans, planId],
  )

  if (!subscriptionId) return null

  const orderDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#080c14] py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
            Tu plan ya esta activo
          </h1>
          <p className="text-[var(--color-denim-300)]">
            Ahora ya puedes configurar los perfiles de tu cuenta.
          </p>
        </div>

        {receiptStatus === 'failed' || receiptStatus === 'warning' ? (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3 text-sm text-amber-100">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>
                La suscripcion se activo correctamente, pero el recibo de compra no pudo confirmarse por correo.
                Puedes continuar usando tu cuenta mientras se revisa el envio.
              </p>
            </div>
          </div>
        ) : receiptStatus === 'sent' ? (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            El recibo de compra fue enviado al correo asociado a tu cuenta.
          </div>
        ) : null}

        {selectedPlan && (
          <PurchaseReceipt
            plan={selectedPlan}
            orderId={subscriptionId}
            orderDate={orderDate}
            transactionId={transactionId || `SUB-${subscriptionId.slice(-8)}`}
          />
        )}

        <div className="mx-auto mt-10 max-w-3xl space-y-6">
          {selectedPlan && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d1220] p-6">
              <h3 className="mb-3 text-sm font-semibold text-white">Tu plan incluye:</h3>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[var(--color-denim-200)]"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 flex-shrink-0 text-[var(--color-primary)]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-info)]/20 bg-[var(--color-info)]/10 p-4">
            <p className="text-sm text-[var(--color-denim-200)]">
              El siguiente paso es elegir y administrar los perfiles disponibles para tu plan.
            </p>
          </div>

          <div className="flex justify-center">
            <Button onClick={() => navigate('/profiles')} className="gap-2">
              Configurar perfiles
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
