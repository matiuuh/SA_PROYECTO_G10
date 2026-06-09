import { useState } from 'react'
import { Button } from '@/components/atoms'
import { ProfileCard } from '@/components/molecules'

export interface Profile {
  id: string
  name: string
  avatarUrl?: string
  color: string
  isKids?: boolean
  isPrimary?: boolean
}

interface ProfileSelectorProps {
  profiles: Profile[]
  maxProfiles?: number
  onSelectProfile: (profileId: string) => void
  onAddProfile?: () => void
  onEditProfile?: (profileId: string) => void
}

export function ProfileSelector({
  profiles,
  maxProfiles = 5,
  onSelectProfile,
  onAddProfile,
  onEditProfile,
}: ProfileSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const canAddMore = profiles.length < maxProfiles

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">Quien esta viendo?</h1>
        <p className="text-xl text-[var(--color-denim-400)]">
          Selecciona tu perfil para continuar
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 mb-12">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            id={profile.id}
            name={profile.isPrimary ? `${profile.name} (Principal)` : profile.name}
            avatarUrl={profile.avatarUrl}
            color={profile.color}
            isEditing={isEditing}
            onClick={() => !isEditing && onSelectProfile(profile.id)}
            onEdit={() => onEditProfile?.(profile.id)}
          />
        ))}

        {canAddMore && onAddProfile && (
          <ProfileCard
            id="add-profile"
            name="Agregar perfil"
            isAddButton
            onClick={onAddProfile}
          />
        )}
      </div>

      <div className="flex gap-4">
        {onEditProfile && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setIsEditing(!isEditing)}
            className="min-w-[200px]"
          >
            {isEditing ? 'Listo' : 'Administrar perfiles'}
          </Button>
        )}
      </div>
    </div>
  )
}
