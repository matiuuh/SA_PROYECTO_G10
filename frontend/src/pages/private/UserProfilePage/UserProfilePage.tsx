import { useState } from 'react'
import { ProfileInfo } from '@/components/organisms'

const mockProfile = {
  name: 'María González',
  email: 'maria.gonzalez@example.com',
  avatarUrl: undefined,
  memberSince: 'Enero 2024',
  plan: 'Premium',
  stats: {
    moviesWatched: 142,
    hoursWatched: 287,
    favoriteGenre: 'Acción',
    watchStreak: 15,
  },
}

export function UserProfilePage() {
  const [profile] = useState(mockProfile)

  const handleAvatarChange = () => {
    console.log('Cambiar avatar')
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-[var(--color-denim-400)]">
            Visualiza tu información y estadísticas de visualización
          </p>
        </div>

        <ProfileInfo profile={profile} onAvatarChange={handleAvatarChange} />
      </div>
    </div>
  )
}
