import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Crown,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button, Card } from '@/components/atoms'
import { PlanCard } from '@/components/molecules'
import { getActiveSession } from '@/lib/auth'
import { processPayment } from '@/lib/cobros-api'
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getPlanQuote,
  getSubscriptionByAccount,
  listActivePlans,
} from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import { syncProfilesAvailability } from '@/lib/usuario-api'
import type { UiPlanQuote, UiSubscriptionPlan } from '@/types/subscription'

type ConfirmAction = 'change' | 'cancel' | null

export function SubscriptionManagementPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const accountId = session?.account.id ?? ''
  const accountCountry = session?.account.pais ?? ''
  const accountEmail = session?.account.correo ?? ''
  const accountName = session?.account.nombre ?? ''
  const accessToken = session?.accessToken ?? ''

  const [plans, setPlans] = useState<UiSubscriptionPlan[]>([])
  const [subscriptionId, setSubscriptionId] = useState('')
  const [currentPlanId, setCurrentPlanId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<'activa' | 'cancelada' | 'sin_suscripcion'>('sin_suscripcion')
  const [quote, setQuote] = useState<UiPlanQuote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)

  useEffect(() => {
    async function loadData() {
      if (!accountId) {
        setIsLoading(false)
        return
      }

      try {
        const [subscription, activePlans] = await Promise.all([
          getSubscriptionByAccount(accountId),
          listActivePlans(),
        ])

        const mappedPlans = activePlans.map(toUiPlan)
        setPlans(mappedPlans)

        if (!subscription) {
          setSubscriptionStatus('sin_suscripcion')
          setSubscriptionId('')
          setCurrentPlanId('')
          setSelectedPlanId(mappedPlans[0]?.id ?? '')
          return
        }

        setSubscriptionId(subscription.id)
        setCurrentPlanId(subscription.plan_id)
        setSelectedPlanId(subscription.plan_id)
        setSubscriptionStatus(subscription.estado === 'activa' ? 'activa' : 'cancelada')
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo cargar la administracion de suscripcion.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [accountId])

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.id === currentPlanId) ?? null,
    [plans, currentPlanId],
  )

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  )

  const isSamePlan = !!selectedPlan && selectedPlan.id === currentPlanId
  const basePriceDifference = selectedPlan && currentPlan ? selectedPlan.price - currentPlan.price : 0
  const profileDifference =
    selectedPlan && currentPlan ? selectedPlan.profileLimit - currentPlan.profileLimit : 0

  useEffect(() => {
    async function loadQuote() {
      if (!selectedPlan || !accountCountry || subscriptionStatus !== 'activa') {
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
          message: error instanceof Error ? error.message : 'No se pudo calcular la conversion.',
        })
      } finally {
        setIsLoadingQuote(false)
      }
    }

    void loadQuote()
  }, [accountCountry, selectedPlan, subscriptionStatus])

  const handleChangePlan = async () => {
    if (!subscriptionId || !selectedPlan || isSamePlan) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const updatedSubscription = await changeSubscriptionPlan(subscriptionId, selectedPlan.id)
      let paymentWarning = ''

      try {
        await processPayment({
          cuenta_id: accountId,
          suscripcion_id: updatedSubscription.id,
          plan_id: selectedPlan.id,
          tipo_operacion: 'modificacion_plan',
          monto_base: selectedPlan.price,
          moneda_local: quote?.localCurrency ?? selectedPlan.currency,
          correo_destino: accountEmail,
          nombre_usuario: accountName,
          descripcion_plan: selectedPlan.name,
        })
      } catch (paymentError) {
        paymentWarning =
          ' El plan se actualizo, pero no se pudo confirmar el envio del recibo de pago al correo.'
        console.warn(
          '[subscription-management] no se pudo completar el procesamiento de cobro o recibo:',
          paymentError instanceof Error ? paymentError.message : paymentError,
        )
      }

      if (accessToken) {
        await syncProfilesAvailability(accessToken, selectedPlan.profileLimit)
      }
      setCurrentPlanId(updatedSubscription.plan_id)
      setSelectedPlanId(updatedSubscription.plan_id)
      setSubscriptionStatus(updatedSubscription.estado === 'activa' ? 'activa' : 'cancelada')
      setSuccessMessage(`Tu suscripcion ahora usa el plan ${selectedPlan.name}. Los perfiles excedentes fueron ajustados segun el nuevo limite.${paymentWarning}`)
      setConfirmAction(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el plan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscriptionId) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await cancelSubscription(subscriptionId)
      if (accessToken) {
        await syncProfilesAvailability(accessToken, 1)
      }
      setSubscriptionStatus('cancelada')
      setSuccessMessage(`${response.message} Solo el perfil principal queda habilitado.`)
      setConfirmAction(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cancelar la suscripcion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-white">
        Cargando administracion de suscripcion...
      </div>
    )
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

        <div className="mb-10 flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-white">Administrar suscripcion</h1>
          <p className="max-w-3xl text-[var(--color-denim-300)]">
            Revisa tu plan actual, compara otro plan disponible y decide si quieres cambiarlo o cancelar
            la suscripcion de forma explicita.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {subscriptionStatus === 'sin_suscripcion' ? (
          <Card className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Todavia no tienes una suscripcion activa</h2>
                <p className="mt-2 text-sm text-[var(--color-denim-300)]">
                  Para habilitar perfiles adicionales y reproduccion completa, primero necesitas activar un plan.
                </p>
              </div>
              <Button onClick={() => navigate('/subscription/plans?setup=1')}>Ver planes</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
              <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-[var(--color-denim-500)]">Plan actual</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {currentPlan?.name ?? 'Plan activo'}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-denim-300)]">
                      {currentPlan?.description ?? 'Sin descripcion disponible.'}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      subscriptionStatus === 'activa'
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    {subscriptionStatus === 'activa' ? 'Activa' : 'Cancelada'}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Precio base</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {currentPlan ? `${currentPlan.currency} ${currentPlan.price.toFixed(2)}` : 'Sin datos'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Perfiles incluidos</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {currentPlan?.profileLimit ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Ubicacion</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {accountCountry || 'No definida'}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Condiciones del cambio</h3>
                    <p className="text-sm text-[var(--color-denim-400)]">
                      Compara el plan actual contra el plan seleccionado antes de confirmar.
                    </p>
                  </div>
                </div>

                {selectedPlan && currentPlan ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <p className="text-sm text-[var(--color-denim-400)]">
                        Cambiaras de <span className="font-semibold text-white">{currentPlan.name}</span> a{' '}
                        <span className="font-semibold text-white">{selectedPlan.name}</span>.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Diferencia de precio</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {basePriceDifference === 0
                            ? 'Sin cambio'
                            : `${basePriceDifference > 0 ? '+' : '-'}${currentPlan.currency} ${Math.abs(basePriceDifference).toFixed(2)}`}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Diferencia de perfiles</p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {profileDifference === 0
                            ? 'Sin cambio'
                            : `${profileDifference > 0 ? '+' : ''}${profileDifference}`}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-4 text-sm text-[var(--color-denim-200)]">
                      {isLoadingQuote ? (
                        'Consultando conversion local del plan seleccionado...'
                      ) : quote?.conversionAvailable && quote.localAmount && quote.localCurrency ? (
                        <>
                          Nuevo cargo estimado: <span className="font-semibold text-white">{quote.localAmount.toFixed(2)} {quote.localCurrency}</span>.
                          {' '}Tasa usada: 1 {quote.baseCurrency} = {quote.exchangeRate?.toFixed(4)} {quote.localCurrency}.
                        </>
                      ) : (
                        quote?.message ?? 'Se mostrara el precio base del plan seleccionado.'
                      )}
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-[var(--color-denim-300)]">
                      {isSamePlan
                        ? 'Selecciona un plan diferente para habilitar el cambio.'
                        : 'La actualizacion se aplicara sobre tu suscripcion activa actual y el cambio se reflejara en tu cuenta.'}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-denim-400)]">No se pudo preparar la comparacion de planes.</p>
                )}
              </Card>
            </div>

            <div className="mb-8">
              <div className="mb-5 flex items-center gap-3">
                <Crown className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-2xl font-semibold text-white">Planes disponibles para cambio</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    {...plan}
                    selected={selectedPlanId === plan.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
              <Card className="flex items-center gap-3 p-4 text-sm text-[var(--color-denim-300)]">
                <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
                {subscriptionStatus === 'activa'
                  ? 'Solo puedes cambiar o cancelar una suscripcion activa. Cada accion requiere confirmacion explicita.'
                  : 'Tu suscripcion ya fue cancelada. Puedes volver a contratar otro plan cuando quieras.'}
              </Card>

              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction('cancel')}
                disabled={subscriptionStatus !== 'activa' || isSubmitting}
                className="min-w-[220px]"
              >
                Cancelar suscripcion
              </Button>

              <Button
                type="button"
                onClick={() => setConfirmAction('change')}
                disabled={subscriptionStatus !== 'activa' || isSamePlan || !selectedPlan || isSubmitting}
                className="min-w-[220px]"
              >
                Confirmar cambio de plan
              </Button>
            </div>
          </>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl shadow-black/60">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {confirmAction === 'change' ? 'Confirmar cambio de plan' : 'Confirmar cancelacion'}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-denim-300)]">
                  {confirmAction === 'change'
                    ? `Tu suscripcion pasara de ${currentPlan?.name ?? 'tu plan actual'} a ${selectedPlan?.name ?? 'el nuevo plan seleccionado'}.`
                    : 'La suscripcion dejara de estar activa y se detendran futuras renovaciones asociadas.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[var(--color-denim-400)] transition-colors hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                confirmAction === 'change'
                  ? 'border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-denim-200)]'
                  : 'border border-amber-500/20 bg-amber-500/10 text-amber-100'
              }`}
            >
              {confirmAction === 'change' ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p>
                      Precio nuevo: <span className="font-semibold text-white">{selectedPlan?.currency} {selectedPlan?.price.toFixed(2)}</span>
                    </p>
                    <p className="mt-1">
                      Perfiles incluidos: <span className="font-semibold text-white">{selectedPlan?.profileLimit ?? 0}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p>Perderas el acceso asociado a la suscripcion activa actual.</p>
                    <p className="mt-1">Si cambias de opinion, luego podras contratar un nuevo plan.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setConfirmAction(null)} disabled={isSubmitting}>
                Volver
              </Button>
              <Button
                type="button"
                variant={confirmAction === 'cancel' ? 'outline' : 'primary'}
                onClick={confirmAction === 'change' ? handleChangePlan : handleCancelSubscription}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? confirmAction === 'change'
                    ? 'Actualizando...'
                    : 'Cancelando...'
                  : confirmAction === 'change'
                    ? 'Si, cambiar plan'
                    : 'Si, cancelar suscripcion'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
