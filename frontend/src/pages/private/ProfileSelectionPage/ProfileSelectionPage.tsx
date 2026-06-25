import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, Trash2, Crown, ShieldCheck, Lock } from 'lucide-react'
import { Button, Input, colorVariants } from '@/components/atoms'
import { ProfileSelector, type Profile } from '@/components/organisms'
import {
  clearActiveProfile,
  getActiveSession,
  getStoredActiveProfile,
  storeActiveProfile,
  syncStoredActiveProfile,
} from '@/lib/auth'
import { getSubscriptionStatusByAccount, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import {
  createProfile,
  deleteProfile,
  removeProfilePin,
  setProfileControlParental,
  setProfilePin,
  syncProfilesAvailability,
  updateProfile,
} from '@/lib/usuario-api'
import type { UserProfile } from '@/types/auth'
import type { UiSubscriptionPlan } from '@/types/subscription'

type ProfileDialogMode = 'create' | 'edit' | null

function mapProfileColor(color: string): string {
  const normalized = color.trim().toLowerCase()

  if (normalized === '#ec4899') return colorVariants[1]
  if (normalized === '#10b981') return colorVariants[2]
  if (normalized === '#f97316') return colorVariants[3]
  if (normalized === '#06b6d4') return colorVariants[4]

  return colorVariants[0]
}

function mapToUiProfile(profile: UserProfile): Profile {
  return {
    id: profile.id,
    name: profile.nombre,
    color: mapProfileColor(profile.color),
    isPrimary: profile.es_principal,
    isEnabled: profile.activo,
  }
}

const availableProfileColors = [
  { value: '#6D28D9', preview: 'from-violet-500 to-purple-600', label: 'Violeta' },
  { value: '#EC4899', preview: 'from-pink-500 to-rose-600', label: 'Rosa' },
  { value: '#10B981', preview: 'from-green-500 to-emerald-600', label: 'Verde' },
  { value: '#F97316', preview: 'from-orange-500 to-red-600', label: 'Naranja' },
  { value: '#06B6D4', preview: 'from-cyan-500 to-blue-600', label: 'Cian' },
]

export function ProfileSelectionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getActiveSession()
  const activeStoredProfile = getStoredActiveProfile()
  const accountId = session?.account.id ?? ''
  const accessToken = session?.accessToken ?? ''
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [activePlan, setActivePlan] = useState<UiSubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [dialogMode, setDialogMode] = useState<ProfileDialogMode>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileColor, setProfileColor] = useState(availableProfileColors[0].value)
  const [makePrimary, setMakePrimary] = useState(false)
  const [hasPin, setHasPin] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [controlParental, setControlParental] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const uiProfiles = useMemo(() => profiles.map(mapToUiProfile), [profiles])
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )
  const activeProfileId = activeStoredProfile?.id ?? null
  const activeStoredProfileId = activeStoredProfile?.id ?? ''
  const maxAllowedProfiles = Math.min(activePlan?.profileLimit ?? 1, 5)

  useEffect(() => {
    async function loadData() {
      if (!accountId || !accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const [subscriptionStatus, plans] = await Promise.all([
          getSubscriptionStatusByAccount(accountId),
          listActivePlans(),
        ])

        if (!subscriptionStatus.tiene_suscripcion) {
          navigate('/subscription/plans', { replace: true })
          return
        }

        const maxActiveProfiles = subscriptionStatus.suscripcion
          ? plans.find((plan) => plan.id === subscriptionStatus.suscripcion?.plan_id)?.perfiles_maximos ?? 1
          : 1
        const syncedProfiles = await syncProfilesAvailability(accessToken, maxActiveProfiles)

        const matchedPlan = plans
          .map(toUiPlan)
          .find((plan) => plan.id === subscriptionStatus.suscripcion?.plan_id) ?? null

        if (syncedProfiles.length === 0) {
          clearActiveProfile()
          setErrorMessage('No hay perfiles disponibles para esta cuenta. Crea uno nuevo para continuar.')
          setActivePlan(matchedPlan)
          setProfiles([])
          return
        }

        const syncedProfile = syncStoredActiveProfile(syncedProfiles)
        if (activeStoredProfile && !syncedProfile) {
          setErrorMessage('El perfil activo ya no esta disponible. Selecciona otro perfil valido.')
        }

        setActivePlan(matchedPlan)
        setProfiles(syncedProfiles)

        if (!subscriptionStatus.tiene_suscripcion) {
          setSuccessMessage('Tu cuenta no tiene suscripcion activa. Solo el perfil principal permanece habilitado.')
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los perfiles.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [accessToken, accountId, activeStoredProfileId, navigate])

  useEffect(() => {
    const reason = (location.state as { reason?: string } | null)?.reason
    if (!reason) return

    if (reason === 'select-profile') {
      setErrorMessage('Selecciona un perfil para continuar con tu historial y preferencias.')
    }

    if (reason === 'invalid-profile') {
      setErrorMessage('El perfil activo ya no pertenece a tu cuenta o ya no esta disponible.')
    }
  }, [location.state])

  const handleSelectProfile = (profileId: string) => {
    const selected = profiles.find((profile) => profile.id === profileId)
    if (!selected || selected.cuenta_id !== session?.account.id) {
      setErrorMessage('El perfil seleccionado no esta disponible para la cuenta activa.')
      return
    }

    if (!selected.activo) {
      setErrorMessage('Ese perfil esta inactivo por el limite actual de tu suscripcion.')
      return
    }

    storeActiveProfile(selected)
    setErrorMessage(`Perfil activo: ${selected.nombre}.`)
    navigate('/panel')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelectedProfileId(null)
    setProfileName('')
    setProfileColor(availableProfileColors[0].value)
    setMakePrimary(false)
    setHasPin(false)
    setPinValue('')
    setControlParental(null)
    setFormError('')
    setIsSubmitting(false)
  }

  function openCreateDialog() {
    setSuccessMessage('')

    if (profiles.length >= maxAllowedProfiles) {
      if (activePlan) {
        setErrorMessage(`Tu plan ${activePlan.name} permite hasta ${maxAllowedProfiles} perfiles.`)
      } else {
        setErrorMessage(`La cuenta ya alcanzo el maximo permitido de ${maxAllowedProfiles} perfiles.`)
      }
      return
    }

    setDialogMode('create')
    setSelectedProfileId(null)
    setProfileName('')
    setProfileColor(availableProfileColors[profiles.length % availableProfileColors.length].value)
    setMakePrimary(false)
    setHasPin(false)
    setPinValue('')
    setControlParental(null)
    setFormError('')
  }

  function openEditDialog(profileId: string) {
    setSuccessMessage('')
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return

    setDialogMode('edit')
    setSelectedProfileId(profile.id)
    setProfileName(profile.nombre)
    setProfileColor(profile.color)
    setMakePrimary(profile.es_principal)
    setHasPin(profile.tiene_pin)
    setPinValue('')
    setControlParental(profile.control_parental)
    setFormError('')
  }

  async function handleSaveProfile() {
    if (!session) return

    const normalizedName = profileName.trim()
    if (!normalizedName) {
      setFormError('El nombre del perfil es obligatorio.')
      return
    }

    if (hasPin && pinValue.length !== 4 && dialogMode === 'edit') {
      setFormError('El PIN debe tener exactamente 4 digitos.')
      return
    }

    setIsSubmitting(true)
    setFormError('')

    try {
      if (dialogMode === 'create') {
        const createdProfile = await createProfile(session.accessToken, {
          nombre: normalizedName,
          color: profileColor,
          es_principal: makePrimary,
        })
        setProfiles((current) => {
          const next = current.map((profile) =>
            createdProfile.es_principal ? { ...profile, es_principal: false } : profile,
          )
          return [...next, createdProfile]
        })
        setSuccessMessage(`Perfil "${createdProfile.nombre}" creado correctamente.`)
      }

      if (dialogMode === 'edit' && selectedProfile) {
        const updatedProfile = await updateProfile(session.accessToken, selectedProfile.id, {
          nombre: normalizedName,
          color: profileColor,
          es_principal: makePrimary !== selectedProfile.es_principal ? makePrimary : undefined,
        })

        if (hasPin && pinValue) {
          await setProfilePin(session.accessToken, selectedProfile.id, { pin: pinValue })
        } else if (selectedProfile.tiene_pin && !hasPin) {
          await removeProfilePin(session.accessToken, selectedProfile.id)
        }

        await setProfileControlParental(session.accessToken, selectedProfile.id, {
          nivel: controlParental || null,
        })

        const finalProfile = { ...updatedProfile, tiene_pin: hasPin, control_parental: controlParental }

        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id === finalProfile.id) return finalProfile as UserProfile
            if (finalProfile.es_principal) {
              return { ...profile, es_principal: false }
            }
            return profile
          }),
        )

        if (activeStoredProfile?.id === finalProfile.id) {
          storeActiveProfile(finalProfile as unknown as UserProfile)
        }

        setSuccessMessage(`Perfil "${finalProfile.nombre}" actualizado correctamente.`)
      }

      setErrorMessage('')
      closeDialog()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el perfil.')
      setIsSubmitting(false)
    }
  }

  async function handleDeleteProfile() {
    if (!session || !selectedProfile) return
    if (selectedProfile.es_principal) {
      setFormError('El perfil principal no puede eliminarse.')
      return
    }

    const confirmed = window.confirm(`Seguro que deseas eliminar el perfil "${selectedProfile.nombre}"?`)
    if (!confirmed) return

    setIsSubmitting(true)
    setFormError('')

    try {
      await deleteProfile(session.accessToken, selectedProfile.id)
      setProfiles((current) => current.filter((profile) => profile.id !== selectedProfile.id))
      if (activeStoredProfile?.id === selectedProfile.id && profiles.length > 1) {
        const fallbackProfile = profiles.find(
          (profile) => profile.id !== selectedProfile.id && profile.activo,
        )
        if (fallbackProfile) {
          storeActiveProfile(fallbackProfile)
        }
      }
      setErrorMessage('')
      setSuccessMessage(`Perfil "${selectedProfile.nombre}" eliminado correctamente.`)
      closeDialog()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el perfil.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-white">
        Cargando perfiles...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080c14] px-4">
      <div className="w-full max-w-6xl">
        {activePlan && (
          <div className="mb-4 rounded-lg border border-white/[0.08] bg-[#0d1220] px-4 py-3 text-sm text-[var(--color-denim-200)]">
            Plan activo: <span className="font-semibold text-white">{activePlan.name}</span>. Puedes usar hasta{' '}
            <span className="font-semibold text-white">{activePlan.profileLimit}</span> perfiles.
          </div>
        )}

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

        <ProfileSelector
          profiles={uiProfiles}
          activeProfileId={activeProfileId}
          maxProfiles={maxAllowedProfiles}
          onSelectProfile={handleSelectProfile}
          onAddProfile={openCreateDialog}
          onEditProfile={openEditDialog}
        />
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl shadow-black/60">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {dialogMode === 'create' ? 'Crear perfil' : 'Editar perfil'}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-denim-300)]">
                  {dialogMode === 'create'
                    ? 'Configura un nuevo perfil para separar historial y preferencias.'
                    : 'Actualiza el nombre, color y estado principal del perfil.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-[var(--color-denim-400)] transition-colors hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <Input
                label="Nombre del perfil"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Ejemplo: Infantil, Mario, Invitados"
                error={formError}
                maxLength={80}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-denim-200)]">Color del perfil</p>
                <div className="grid grid-cols-5 gap-3">
                  {availableProfileColors.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => setProfileColor(colorOption.value)}
                      className={`h-14 rounded-xl border-2 bg-gradient-to-br ${colorOption.preview} transition-transform hover:scale-105 ${
                        profileColor === colorOption.value
                          ? 'border-white shadow-lg shadow-black/40'
                          : 'border-transparent'
                      }`}
                      aria-label={`Seleccionar color ${colorOption.label}`}
                      title={colorOption.label}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                <input
                  type="checkbox"
                  checked={makePrimary}
                  onChange={(event) => setMakePrimary(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-[#080c14]"
                />
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <Crown size={15} className="text-[var(--color-primary)]" />
                    Perfil principal
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-denim-400)]">
                    El perfil principal aparece destacado y puede usarse como perfil base de la cuenta.
                  </p>
                </div>
              </label>

              {dialogMode === 'edit' && (
                <>
                  <div className="border-t border-white/[0.06] pt-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                      <p className="text-sm font-semibold text-white">Control Parental</p>
                    </div>
                    <p className="mb-3 text-xs text-[var(--color-denim-400)]">
                      Configura un PIN restrictivo para limitar el acceso a contenido no apto para este perfil.
                    </p>

                    <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                      <input
                        type="checkbox"
                        checked={hasPin}
                        onChange={(event) => {
                          setHasPin(event.target.checked)
                          if (!event.target.checked) {
                            setPinValue('')
                            setControlParental(null)
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-[#080c14]"
                      />
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-white">
                          <Lock size={15} className="text-[var(--color-warning)]" />
                          Activar PIN restrictivo
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-denim-400)]">
                          Se solicitara este PIN al reproducir contenido no apto para menores.
                        </p>
                      </div>
                    </label>

                    {hasPin && (
                      <div className="mt-3 space-y-3 pl-7">
                        <Input
                          label="PIN de 4 digitos"
                          value={pinValue}
                          onChange={(event) => {
                            const val = event.target.value.replace(/\D/g, '').slice(0, 4)
                            setPinValue(val)
                          }}
                          placeholder="****"
                          type="password"
                          maxLength={4}
                          inputMode="numeric"
                        />

                        <div className="space-y-1.5">
                          <p className="text-sm font-medium text-[var(--color-denim-200)]">
                            Clasificacion maxima permitida sin PIN
                          </p>
                          <div className="flex gap-2">
                            {[
                              { value: 'TP', label: 'TP', desc: 'Todo publico' },
                              { value: 'PG-13', label: 'PG-13', desc: 'Mayores de 13' },
                              { value: 'R', label: 'R', desc: 'Mayores de 18' },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setControlParental(option.value)}
                                className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                                  controlParental === option.value
                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                                    : 'border-white/[0.08] bg-white/[0.03] text-[var(--color-denim-300)] hover:bg-white/[0.07]'
                                }`}
                              >
                                <span className="block font-semibold">{option.label}</span>
                                <span className="block text-[10px] opacity-70">{option.desc}</span>
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-[var(--color-denim-500)]">
                            Los contenidos con clasificacion superior a la seleccionada requeriran el PIN para reproducirse.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              {dialogMode === 'edit' && selectedProfile?.es_principal && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  El perfil principal creado para la cuenta no puede eliminarse.
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
                <div>
                  {dialogMode === 'edit' && selectedProfile && (
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      disabled={isSubmitting || selectedProfile.es_principal}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Eliminar perfil
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleSaveProfile} disabled={isSubmitting}>
                    {isSubmitting
                      ? dialogMode === 'create'
                        ? 'Creando...'
                        : 'Guardando...'
                      : dialogMode === 'create'
                        ? 'Crear perfil'
                        : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
