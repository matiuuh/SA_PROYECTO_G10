import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CheckoutForm, OrderSummary } from '@/components/organisms'
import { SUBSCRIPTION_PLANS } from '@/data/subscriptionPlans'
import type { CheckoutFormData } from '@/types/subscription'

export function SubscriptionCheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'standard'
  
  const [isLoading, setIsLoading] = useState(false)
  
  const selectedPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1]

  const handleSubmit = async (data: CheckoutFormData) => {
    setIsLoading(true)
    
    console.log('Processing payment with data:', data)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    const orderId = `ORD-${Date.now()}`
    navigate(`/subscription/confirmation?order=${orderId}&plan=${selectedPlan.id}`)
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

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Finalizar compra</h1>
          <p className="text-[var(--color-denim-400)]">
            Completa tu información para activar tu suscripción
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckoutForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-1">
            <OrderSummary plan={selectedPlan} />
          </div>
        </div>
      </div>
    </div>
  )
}
