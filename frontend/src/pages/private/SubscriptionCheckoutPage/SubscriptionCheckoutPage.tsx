import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CheckoutForm, OrderSummary } from '@/components/organisms'
import { getActiveSession } from '@/lib/auth'
import { processPayment } from '@/lib/cobros-api'
import { createSubscription, getPlanQuote, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { CheckoutFormData, UiPlanQuote, UiSubscriptionPlan } from '@/types/subscription'

export function SubscriptionCheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = getActiveSession()
  const planId = searchParams.get('plan') ?? ''
  const accountId = session?.account.id ?? ''
  const accountCountry = session?.account.pais ?? ''
  const accountEmail = session?.account.correo ?? ''
  const accountName = session?.account.nombre ?? ''

  const [plans, setPlans] = useState<UiSubscriptionPlan[]>([])
  const [quote, setQuote] = useState<UiPlanQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
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

  useEffect(() => {
    async function loadQuote() {
      if (!accountCountry || !selectedPlan) {
        setQuote(null)
        return
      }

      setIsLoadingQuote(true)
      try {
        const data = await getPlanQuote(selectedPlan.id, accountCountry)
        setQuote({
          basePrice: Number(data.precio_base),
          baseCurrency: data.moneda_base,
          localCurrency: data.moneda_local,
          localAmount: data.monto_local ? Number(data.monto_local) : null,
          exchangeRate: data.tasa_cambio ? Number(data.tasa_cambio) : null,
          conversionAvailable: data.conversion_disponible,
          message: data.mensaje,
        })
      } catch (error) {
        setQuote({
          basePrice: selectedPlan.price,
          baseCurrency: selectedPlan.currency,
          localCurrency: null,
          localAmount: null,
          exchangeRate: null,
          conversionAvailable: false,
          message: error instanceof Error ? error.message : 'No se pudo consultar el tipo de cambio.',
        })
      } finally {
        setIsLoadingQuote(false)
      }
    }

    void loadQuote()
  }, [accountCountry, selectedPlan])

  const handleSubmit = async (_data: CheckoutFormData) => {
    if (!accountId || !selectedPlan) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const subscription = await createSubscription(session?.accessToken ?? '', accountId, selectedPlan.id)
      let transactionId = ''
      let receiptStatus = 'not_requested'

      try {
        const payment = await processPayment({
          cuenta_id: accountId,
          suscripcion_id: subscription.id,
          plan_id: selectedPlan.id,
          tipo_operacion: 'contratacion',
          monto_base: selectedPlan.price,
          moneda_local: quote?.localCurrency ?? selectedPlan.currency,
          correo_destino: accountEmail,
          nombre_usuario: accountName,
          descripcion_plan: selectedPlan.name,
        })
        transactionId = payment.transaccion.id
        receiptStatus = payment.recibo?.enviado ? 'sent' : 'failed'
      } catch (paymentError) {
        receiptStatus = 'warning'
        console.warn(
          '[checkout] no se pudo completar el procesamiento de cobro o recibo:',
          paymentError instanceof Error ? paymentError.message : paymentError,
        )
      }

      const nextParams = new URLSearchParams({
        subscription: subscription.id,
        plan: selectedPlan.id,
      })
      if (transactionId) {
        nextParams.set('transaction', transactionId)
      }
      if (receiptStatus) {
        nextParams.set('receipt', receiptStatus)
      }

      navigate(`/subscription/confirmation?${nextParams.toString()}`)
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
          {session && (
            <p className="mt-2 text-sm text-[var(--color-denim-300)]">
              Ubicacion detectada: <span className="font-semibold text-white">{session.account.pais}</span>
            </p>
          )}
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
              {isLoadingQuote && (
                <div className="mb-4 text-sm text-[var(--color-denim-400)]">Consultando tipo de cambio...</div>
              )}
              <OrderSummary plan={selectedPlan} quote={quote} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
