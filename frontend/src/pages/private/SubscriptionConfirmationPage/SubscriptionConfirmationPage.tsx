import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/atoms'
import { PurchaseReceipt } from '@/components/organisms'
import { SUBSCRIPTION_PLANS } from '@/data/subscriptionPlans'

export function SubscriptionConfirmationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  const planId = searchParams.get('plan') || 'standard'

  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1]

  useEffect(() => {
    if (!orderId) {
      navigate('/dashboard')
    }
  }, [orderId, navigate])

  if (!orderId) return null

  const orderDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#080c14] py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            ¡Prepárate para Disfrutar!
          </h1>
          <p className="text-[var(--color-denim-300)]">
            Tu suscripción ha sido activada exitosamente
          </p>
        </div>

        <PurchaseReceipt
          plan={selectedPlan}
          orderId={orderId}
          orderDate={orderDate}
          transactionId={`TXN-${orderId.slice(-8)}`}
        />

        <div className="mt-10 space-y-6 max-w-3xl mx-auto">
          <div className="bg-[#0d1220] border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">
              Tu plan incluye:
            </h3>
            <ul className="space-y-2">
              {selectedPlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-[var(--color-denim-200)]"
                >
                  <CheckCircle2
                    size={16}
                    className="text-[var(--color-primary)] mt-0.5 flex-shrink-0"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 rounded-2xl p-4">
            <p className="text-sm text-[var(--color-denim-200)]">
              📧 Hemos enviado un email de confirmación con todos los detalles de tu
              suscripción.
            </p>
          </div>

          <div className="flex justify-center">
            <Button onClick={() => navigate('/dashboard')} className="gap-2">
              Ir al inicio
              <ArrowRight size={18} />
            </Button>
          </div>

          <p className="text-center text-xs text-[var(--color-denim-400)]">
            ¿Necesitas ayuda? Contáctanos en soporte@streaming.com
          </p>
        </div>
      </div>
    </div>
  )
}
