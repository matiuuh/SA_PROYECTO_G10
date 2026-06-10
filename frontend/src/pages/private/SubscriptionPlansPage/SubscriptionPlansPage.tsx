import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/atoms'
import { PlanCard } from '@/components/molecules'
import { listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { UiSubscriptionPlan } from '@/types/subscription'

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<UiSubscriptionPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const setupMode = searchParams.get('setup') === '1'

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await listActivePlans()
        const mappedPlans = data.map(toUiPlan)
        setPlans(mappedPlans)
        if (mappedPlans.length > 0) {
          setSelectedPlanId(mappedPlans[0].id)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los planes.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPlans()
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const handleContinue = () => {
    if (!selectedPlan) return
    navigate(`/subscription/checkout?plan=${selectedPlan.id}`)
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

        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-white">
            {setupMode ? 'Activa tu primer plan' : 'Elige tu plan perfecto'}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--color-denim-300)]">
            {setupMode
              ? 'Tu cuenta ya esta lista. El siguiente paso es activar una suscripcion para habilitar tus perfiles.'
              : 'Disfruta de todo nuestro contenido y elige cuantos perfiles quieres habilitar.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center text-white">
            Cargando planes...
          </div>
        ) : (
          <>
            <div className="mb-10 grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  {...plan}
                  selected={selectedPlanId === plan.id}
                  onSelect={() => setSelectedPlanId(plan.id)}
                />
              ))}
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={handleContinue} className="px-12" disabled={!selectedPlan}>
                {selectedPlan ? `Continuar con ${selectedPlan.name}` : 'Selecciona un plan'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
