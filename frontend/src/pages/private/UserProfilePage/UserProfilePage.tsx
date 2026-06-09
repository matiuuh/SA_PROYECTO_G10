import { useState } from 'react'
import { ProfileInfo } from '@/components/organisms'
import { getActiveSession } from '@/lib/auth'

const session = getActiveSession()

const initialProfile = {
  name: session?.account.nombre ?? 'Usuario Quetzal',
  email: session?.account.correo ?? 'usuario@quetzal.tv',
  avatarUrl: undefined,
  memberSince: session?.account.creado_en
    ? new Date(session.account.creado_en).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
      })
    : 'Reciente',
  plan: 'Activo',
  stats: {
    moviesWatched: 0,
    hoursWatched: 0,
    favoriteGenre: 'Sin datos',
    watchStreak: 0,
  },
}

export function UserProfilePage() {
  const [profile] = useState(initialProfile)

  const handleAvatarChange = () => {
    console.log('Cambiar avatar')
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-[var(--color-denim-400)]">
            Visualiza tu informacion y estadisticas de visualizacion
          </p>
        </div>

        <ProfileInfo profile={profile} onAvatarChange={handleAvatarChange} />
      </div>
    </div>
  )
}
