import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Crown, KeyRound, Settings, Users } from 'lucide-react'
import { Button, Card } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { changePassword } from '@/lib/usuario-api'
import { getSubscriptionStatusByAccount, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import type { UiSubscriptionPlan } from '@/types/subscription'

export function UserSettingsPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const accountId = session?.account.id ?? ''
  const [activePlan, setActivePlan] = useState<UiSubscriptionPlan | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)

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

  const handleEditProfile = () => {
    navigate('/profiles')
  }

  const handleManagePayment = () => {
    navigate(hasSubscription ? '/subscription/manage' : '/subscription/plans?setup=1')
  }

  const handleChangePassword = async () => {
    if (!session?.accessToken) return

    setPasswordFeedback('')
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmacion de la contrasena no coincide.')
      return
    }

    setIsSavingPassword(true)
    try {
      await changePassword(session.accessToken, {
        contrasena_actual: currentPassword,
        contrasena_nueva: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordFeedback('Contrasena actualizada correctamente.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'No se pudo actualizar la contrasena.')
    } finally {
      setIsSavingPassword(false)
    }
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
            <p className="text-[var(--color-denim-400)]">Administra tu cuenta, tus perfiles y tu acceso</p>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Cambiar contrasena</h2>
                <p className="text-sm text-[var(--color-denim-400)]">Protege tu acceso actualizando tus credenciales.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-denim-200)]">Contrasena actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d1220] px-4 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-denim-200)]">Nueva contrasena</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d1220] px-4 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-denim-200)]">Confirmar nueva contrasena</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d1220] px-4 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
                />
              </div>

              {passwordError ? <p className="text-sm text-red-300">{passwordError}</p> : null}
              {passwordFeedback ? <p className="text-sm text-emerald-300">{passwordFeedback}</p> : null}

              <Button type="button" onClick={handleChangePassword} disabled={isSavingPassword} className="gap-2">
                <KeyRound size={16} />
                {isSavingPassword ? 'Actualizando...' : 'Actualizar contrasena'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Perfiles</h2>
                <p className="text-sm text-[var(--color-denim-400)]">Administra los perfiles asociados a tu cuenta.</p>
              </div>
            </div>

            <p className="mb-4 text-sm text-[var(--color-denim-300)]">
              Crea, edita o elimina perfiles segun el limite permitido por tu plan.
            </p>

            <Button type="button" variant="outline" onClick={handleEditProfile}>
              Gestionar perfiles
            </Button>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)]/12 text-[var(--color-primary)]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Suscripcion y pagos</h2>
                <p className="text-sm text-[var(--color-denim-400)]">Consulta tu plan y cambia tu suscripcion cuando lo necesites.</p>
              </div>
            </div>

            <p className="mb-4 text-sm text-[var(--color-denim-300)]">
              {activePlan
                ? `Tu plan actual permite hasta ${activePlan.profileLimit} perfiles.`
                : 'Aun no tienes una suscripcion activa.'}
            </p>

            <Button type="button" variant={activePlan ? 'outline' : 'primary'} onClick={handleManagePayment}>
              {activePlan ? 'Administrar suscripcion' : 'Activar suscripcion'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
