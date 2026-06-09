import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colorVariants } from '@/components/atoms'
import { ProfileSelector, type Profile } from '@/components/organisms'
import { getActiveSession, storeActiveProfile } from '@/lib/auth'
import { getSubscriptionByAccount, listActivePlans } from '@/lib/suscripcion-api'
import { toUiPlan } from '@/lib/subscription-plans'
import { createProfile, listProfiles, updateProfile } from '@/lib/usuario-api'
import type { UserProfile } from '@/types/auth'
import type { UiSubscriptionPlan } from '@/types/subscription'

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

const availableProfileColors = ['#6D28D9', '#EC4899', '#10B981', '#F97316', '#06B6D4']

export function ProfileSelectionPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [activePlan, setActivePlan] = useState<UiSubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const uiProfiles = useMemo(() => profiles.map(mapToUiProfile), [profiles])

  useEffect(() => {
    async function loadData() {
      if (!session) {
        setIsLoading(false)
        return
      }

      try {
        const [subscription, plans, accountProfiles] = await Promise.all([
          getSubscriptionByAccount(session.account.id),
          listActivePlans(),
          listProfiles(session.accessToken),
        ])

        if (!subscription) {
          navigate('/subscription/plans?setup=1', { replace: true })
          return
        }

        const matchedPlan = plans.map(toUiPlan).find((plan) => plan.id === subscription.plan_id) ?? null
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
    const selectedProfile = profiles.find((profile) => profile.id === profileId)
    if (!selectedProfile) return

    storeActiveProfile(selectedProfile)
    navigate('/panel')
  }

  async function handleAddProfile() {
    if (!session) return

    if (activePlan && profiles.length >= activePlan.profileLimit) {
      setErrorMessage(`Tu plan ${activePlan.name} permite hasta ${activePlan.profileLimit} perfiles.`)
      return
    }

    const nombre = window.prompt('Nombre del nuevo perfil')
    if (!nombre) return

    try {
      const color = availableProfileColors[profiles.length % availableProfileColors.length]
      const createdProfile = await createProfile(session.accessToken, {
        nombre: nombre.trim(),
        color,
      })
      setProfiles((current) => [...current, createdProfile])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo crear el perfil.')
    }
  }

  async function handleEditProfile(profileId: string) {
    if (!session) return

    const currentProfile = profiles.find((profile) => profile.id === profileId)
    if (!currentProfile) return

    const nombre = window.prompt('Nuevo nombre del perfil', currentProfile.nombre)
    if (!nombre) return

    const makePrimary = window.confirm(
      'Quieres marcar este perfil como principal? Presiona Cancelar para solo cambiar el nombre.',
    )

    try {
      const updatedProfile = await updateProfile(session.accessToken, profileId, {
        nombre: nombre.trim(),
        es_principal: makePrimary ? true : undefined,
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
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.')
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
          onAddProfile={handleAddProfile}
          onEditProfile={handleEditProfile}
        />
      </div>
    </div>
  )
}
