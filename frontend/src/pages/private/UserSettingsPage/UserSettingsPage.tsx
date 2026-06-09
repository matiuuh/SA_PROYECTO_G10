import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, User, Sliders, X, CreditCard, Crown } from 'lucide-react'
import { AccountSettings, PreferencesSettings } from '@/components/organisms'
import { Button, Card } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { getSubscriptionStatusByAccount, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { UiSubscriptionPlan } from '@/types/subscription'

type SettingsTab = 'account' | 'preferences'

interface PendingActionState {
  title: string
  description: string
}

export function UserSettingsPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const accountId = session?.account.id ?? ''
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [activePlan, setActivePlan] = useState<UiSubscriptionPlan | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingActionState | null>(null)

  useEffect(() => {
    async function loadSubscriptionData() {
      if (!accountId) return

      const [status, plans] = await Promise.all([
        getSubscriptionStatusByAccount(accountId),
        listActivePlans(),
      ])

      setHasSubscription(status.tiene_suscripcion)

      if (status.suscripcion) {
        const matchedPlan =
          plans.map(toUiPlan).find((plan) => plan.id === status.suscripcion?.plan_id) ?? null
        setActivePlan(matchedPlan)
      }
    }

    void loadSubscriptionData()
  }, [accountId])

  const memberSince = useMemo(() => {
    if (!session?.account.creado_en) return 'Reciente'
    return new Date(session.account.creado_en).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
    })
  }, [session?.account.creado_en])

  const openPendingModal = (title: string, description: string) => {
    setPendingAction({ title, description })
  }

  const handleEditProfile = () => {
    navigate('/profiles')
  }

  const handleChangeEmail = () => {
    openPendingModal(
      'Cambiar correo electronico',
      'Esta accion aun no esta conectada a backend. Falta implementar el endpoint para actualizar el correo de la cuenta.',
    )
  }

  const handleChangePassword = () => {
    openPendingModal(
      'Cambiar contrasena',
      'Esta accion aun no esta conectada a backend. Falta implementar el flujo de actualizacion de credenciales en usuario-service.',
    )
  }

  const handleManagePayment = () => {
    navigate(hasSubscription ? '/subscription/manage' : '/subscription/plans?setup=1')
  }

  const handlePrivacySettings = () => {
    openPendingModal(
      'Configuracion de privacidad',
      'Por ahora las preferencias visuales existen solo en frontend. Todavia no se persisten en backend.',
    )
  }

  const handleDeleteAccount = () => {
    openPendingModal(
      'Eliminar cuenta',
      'Eliminar cuenta aun no esta implementado en backend. Antes de habilitarlo debemos definir la regla de borrado de perfiles, sesiones y suscripciones.',
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-denim-800)]">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configuracion</h1>
            <p className="text-[var(--color-denim-400)]">Administra tu cuenta y preferencias</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--color-denim-400)]">Cuenta</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{session?.account.nombre ?? 'Usuario'}</h2>
                <p className="mt-1 text-sm text-[var(--color-denim-300)]">{session?.account.correo ?? 'Sin correo'}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-[var(--color-denim-500)]">
                  Miembro desde {memberSince}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Pais</p>
                <p className="mt-1 text-sm font-medium text-white">{session?.account.pais ?? 'No definido'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {hasSubscription ? <Crown className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm text-[var(--color-denim-400)]">Suscripcion</p>
                <h3 className="text-lg font-semibold text-white">
                  {activePlan ? activePlan.name : 'Sin plan activo'}
                </h3>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--color-denim-300)]">
              {activePlan
                ? `Tu plan actual permite hasta ${activePlan.profileLimit} perfiles.`
                : 'Activa un plan para habilitar perfiles adicionales y reproduccion completa.'}
            </p>
            <Button
              type="button"
              variant={activePlan ? 'outline' : 'primary'}
              size="sm"
              onClick={handleManagePayment}
              className="mt-4 w-full"
            >
              {activePlan ? 'Administrar suscripcion' : 'Activar suscripcion'}
            </Button>
          </Card>
        </div>

        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                  activeTab === 'account'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-denim-300)] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 font-medium">
                  <User className="h-5 w-5" />
                  Cuenta
                </span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                  activeTab === 'preferences'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-denim-300)] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 font-medium">
                  <Sliders className="h-5 w-5" />
                  Preferencias
                </span>
              </button>
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'account' && (
              <AccountSettings
                onEditProfile={handleEditProfile}
                onChangeEmail={handleChangeEmail}
                onChangePassword={handleChangePassword}
                onManagePayment={handleManagePayment}
                onPrivacySettings={handlePrivacySettings}
                onDeleteAccount={handleDeleteAccount}
              />
            )}

            {activeTab === 'preferences' && <PreferencesSettings />}
          </main>
        </div>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl shadow-black/60">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{pendingAction.title}</h2>
                <p className="mt-2 text-sm text-[var(--color-denim-300)]">{pendingAction.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[var(--color-denim-400)] transition-colors hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-denim-200)]">
              Esta opcion se puede habilitar despues, pero requiere endpoints adicionales en backend para funcionar de verdad.
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setPendingAction(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
