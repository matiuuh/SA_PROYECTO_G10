import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CheckoutForm, OrderSummary } from '@/components/organisms'
import { getActiveSession } from '@/lib/auth'
import { listActivePlans, createSubscription } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { CheckoutFormData, UiSubscriptionPlan } from '@/types/subscription'

export function SubscriptionCheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = getActiveSession()
  const planId = searchParams.get('plan') ?? ''

  const [plans, setPlans] = useState<UiSubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await listActivePlans()
        setPlans(data.map(toUiPlan))
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el plan.')
      } finally {
        setIsLoadingPlan(false)
      }
    }

    void loadPlans()
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === planId) ?? null,
    [plans, planId],
  )

  const handleSubmit = async (_data: CheckoutFormData) => {
    if (!session || !selectedPlan) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const subscription = await createSubscription(session.account.id, selectedPlan.id)
      navigate(`/subscription/confirmation?subscription=${subscription.id}&plan=${selectedPlan.id}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo activar la suscripcion.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[var(--color-denim-300)] transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-bold text-white">Finalizar suscripcion</h1>
          <p className="text-[var(--color-denim-400)]">
            Completa tu informacion para activar el plan y habilitar tus perfiles.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {isLoadingPlan || !selectedPlan ? (
          <div className="flex min-h-[260px] items-center justify-center text-white">
            Cargando informacion del plan...
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CheckoutForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            <div className="lg:col-span-1">
              <OrderSummary plan={selectedPlan} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
