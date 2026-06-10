import { Pencil } from 'lucide-react'
import { ProfileAvatar } from '@/components/atoms'

interface ProfileCardProps {
  id: string
  name: string
  avatarUrl?: string
  color?: string
  isEnabled?: boolean
  isActive?: boolean
  isAddButton?: boolean
  isEditing?: boolean
  onClick?: () => void
  onEdit?: () => void
}

export function ProfileCard({
  name,
  avatarUrl,
  color,
  isEnabled = true,
  isActive = false,
  isAddButton = false,
  isEditing = false,
  onClick,
  onEdit,
}: ProfileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-4 ${isEnabled || isAddButton ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'}`}
    >
      <div className="relative">
        <ProfileAvatar
          src={avatarUrl}
          alt={name}
          color={color}
          size="xl"
          isAddButton={isAddButton}
          className={`
            transition-all duration-300
            ${!isAddButton && isEnabled ? 'group-hover:border-white group-hover:scale-105' : ''}
            ${isActive ? 'ring-4 ring-[var(--color-primary)]/40 ring-offset-4 ring-offset-[#080c14]' : ''}
          `}
        />

        {isActive && !isAddButton && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-black/40">
            Activo
          </div>
        )}

        {!isEnabled && !isAddButton && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/30 bg-amber-500/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#080c14] shadow-lg shadow-black/40">
            Inactivo
          </div>
        )}

        {isEditing && !isAddButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            disabled={!isEnabled}
            className="
              absolute -top-2 -right-2
              w-10 h-10 rounded-full
              bg-white/10 backdrop-blur-sm border-2 border-white/20
              flex items-center justify-center
              hover:bg-white/20 hover:border-white/40
              transition-all duration-200
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <Pencil className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <div className="text-center">
        <h3
          className={`
            text-xl font-medium transition-colors duration-200
            ${isAddButton ? 'text-white/50 group-hover:text-white/70' : 'text-[var(--color-denim-300)] group-hover:text-white'}
            ${isActive ? 'text-white' : ''}
            ${!isEnabled && !isAddButton ? '!text-amber-200' : ''}
          `}
        >
          {name}
        </h3>
      </div>
    </div>
  )
}
