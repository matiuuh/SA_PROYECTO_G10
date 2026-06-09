import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, Crown } from 'lucide-react'
import { Button, Input, colorVariants } from '@/components/atoms'
import { ProfileSelector, type Profile } from '@/components/organisms'
import { getActiveSession, getStoredActiveProfile, storeActiveProfile } from '@/lib/auth'
import { getSubscriptionStatusByAccount, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import { createProfile, deleteProfile, listProfiles, updateProfile } from '@/lib/usuario-api'
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
  const navigate = useNavigate()
  const session = getActiveSession()
  const activeStoredProfile = getStoredActiveProfile()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [activePlan, setActivePlan] = useState<UiSubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [dialogMode, setDialogMode] = useState<ProfileDialogMode>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileColor, setProfileColor] = useState(availableProfileColors[0].value)
  const [makePrimary, setMakePrimary] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const uiProfiles = useMemo(() => profiles.map(mapToUiProfile), [profiles])
  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  )

  useEffect(() => {
    async function loadData() {
      if (!session) {
        setIsLoading(false)
        return
      }

      try {
        const [subscriptionStatus, plans, accountProfiles] = await Promise.all([
          getSubscriptionStatusByAccount(session.account.id),
          listActivePlans(),
          listProfiles(session.accessToken),
        ])

        if (!subscriptionStatus.tiene_suscripcion || !subscriptionStatus.suscripcion) {
          navigate('/subscription/plans?setup=1', { replace: true })
          return
        }

        const matchedPlan = plans
          .map(toUiPlan)
          .find((plan) => plan.id === subscriptionStatus.suscripcion?.plan_id) ?? null
        setActivePlan(matchedPlan)
        setProfiles(accountProfiles)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los perfiles.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [navigate, session])

  const handleSelectProfile = (profileId: string) => {
    const selected = profiles.find((profile) => profile.id === profileId)
    if (!selected) return

    storeActiveProfile(selected)
    navigate('/panel')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelectedProfileId(null)
    setProfileName('')
    setProfileColor(availableProfileColors[0].value)
    setMakePrimary(false)
    setFormError('')
    setIsSubmitting(false)
  }

  function openCreateDialog() {
    if (activePlan && profiles.length >= activePlan.profileLimit) {
      setErrorMessage(`Tu plan ${activePlan.name} permite hasta ${activePlan.profileLimit} perfiles.`)
      return
    }

    setDialogMode('create')
    setSelectedProfileId(null)
    setProfileName('')
    setProfileColor(availableProfileColors[profiles.length % availableProfileColors.length].value)
    setMakePrimary(false)
    setFormError('')
  }

  function openEditDialog(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return

    setDialogMode('edit')
    setSelectedProfileId(profile.id)
    setProfileName(profile.nombre)
    setProfileColor(profile.color)
    setMakePrimary(profile.es_principal)
    setFormError('')
  }

  async function handleSaveProfile() {
    if (!session) return

    const normalizedName = profileName.trim()
    if (!normalizedName) {
      setFormError('El nombre del perfil es obligatorio.')
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
      }

      if (dialogMode === 'edit' && selectedProfile) {
        const updatedProfile = await updateProfile(session.accessToken, selectedProfile.id, {
          nombre: normalizedName,
          color: profileColor,
          es_principal: makePrimary !== selectedProfile.es_principal ? makePrimary : undefined,
        })

        setProfiles((current) =>
          current.map((profile) => {
            if (profile.id === updatedProfile.id) return updatedProfile
            if (updatedProfile.es_principal) {
              return { ...profile, es_principal: false }
            }
            return profile
          }),
        )

        if (activeStoredProfile?.id === updatedProfile.id) {
          storeActiveProfile(updatedProfile)
        }
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

    const confirmed = window.confirm(`Seguro que deseas eliminar el perfil "${selectedProfile.nombre}"?`)
    if (!confirmed) return

    setIsSubmitting(true)
    setFormError('')

    try {
      await deleteProfile(session.accessToken, selectedProfile.id)
      setProfiles((current) => current.filter((profile) => profile.id !== selectedProfile.id))
      if (activeStoredProfile?.id === selectedProfile.id && profiles.length > 1) {
        const fallbackProfile = profiles.find((profile) => profile.id !== selectedProfile.id)
        if (fallbackProfile) {
          storeActiveProfile(fallbackProfile)
        }
      }
      setErrorMessage('')
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

        <ProfileSelector
          profiles={uiProfiles}
          maxProfiles={activePlan?.profileLimit ?? 1}
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

              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
                <div>
                  {dialogMode === 'edit' && selectedProfile && (
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50"
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
