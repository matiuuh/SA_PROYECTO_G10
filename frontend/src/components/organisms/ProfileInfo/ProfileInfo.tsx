import { Film, Clock, Star, TrendingUp } from 'lucide-react'
import { Card, Badge } from '@/components/atoms'
import { ProfileHeader, StatCard } from '@/components/molecules'

interface UserProfile {
  name: string
  email: string
  avatarUrl?: string
  memberSince: string
  plan: string
  stats: {
    moviesWatched: number
    hoursWatched: number
    favoriteGenre: string
    watchStreak: number
  }
}

interface ProfileInfoProps {
  profile: UserProfile
  onAvatarChange?: () => void
}

export function ProfileInfo({ profile, onAvatarChange }: ProfileInfoProps) {
  return (
    <div className="space-y-6">
      <Card className="p-8">
        <ProfileHeader
          name={profile.name}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
          onAvatarChange={onAvatarChange}
          editable={!!onAvatarChange}
        />

        <div className="mt-6 pt-6 border-t border-white/[0.07] flex items-center gap-4">
          <div>
            <p className="text-sm text-[var(--color-denim-400)] mb-1">Plan actual</p>
            <Badge variant="info" className="text-sm px-3 py-1">
              {profile.plan}
            </Badge>
          </div>
          <div className="h-8 w-px bg-white/[0.07]" />
          <div>
            <p className="text-sm text-[var(--color-denim-400)] mb-1">Miembro desde</p>
            <p className="text-white font-medium">{profile.memberSince}</p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Estadísticas de visualización</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Film className="w-6 h-6" />}
            label="Películas vistas"
            value={profile.stats.moviesWatched}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Horas de contenido"
            value={profile.stats.hoursWatched}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            icon={<Star className="w-6 h-6" />}
            label="Género favorito"
            value={profile.stats.favoriteGenre}
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Racha de días"
            value={profile.stats.watchStreak}
            trend={{ value: 5, isPositive: true }}
          />
        </div>
      </div>
    </div>
  )
}
