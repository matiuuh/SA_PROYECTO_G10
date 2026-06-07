import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/atoms'
import { PlanCard } from '@/components/molecules'
import { SUBSCRIPTION_PLANS } from '@/data/subscriptionPlans'
import type { PlanTier } from '@/types/subscription'

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('standard')

  const handleContinue = () => {
    navigate(`/subscription/checkout?plan=${selectedPlan}`)
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-denim-300)] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Elige tu plan perfecto
          </h1>
          <p className="text-lg text-[var(--color-denim-300)] max-w-2xl mx-auto">
            Disfruta de todo nuestro contenido sin límites. Cancela cuando quieras.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              {...plan}
              selected={selectedPlan === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
            />
          ))}
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleContinue} className="px-12">
            Continuar con {SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.name}
          </Button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--color-denim-400)]">
            Todos los planes incluyen acceso completo al catálogo y sin anuncios.
            <br />
            Puedes cambiar o cancelar tu plan en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  )
}
