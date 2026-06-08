import { Camera } from 'lucide-react'
import { Avatar } from '@/components/atoms'

interface ProfileHeaderProps {
  name: string
  email: string
  avatarUrl?: string
  onAvatarChange?: () => void
  editable?: boolean
}

export function ProfileHeader({
  name,
  email,
  avatarUrl,
  onAvatarChange,
  editable = false,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative group">
        <Avatar src={avatarUrl} alt={name} size="xl" />
        {editable && onAvatarChange && (
          <button
            onClick={onAvatarChange}
            className="
              absolute inset-0 rounded-full
              bg-black/60 opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              flex items-center justify-center
              cursor-pointer
            "
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        )}
      </div>

      <div className="flex-1">
        <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
        <p className="text-[var(--color-denim-400)]">{email}</p>
      </div>
    </div>
  )
}
