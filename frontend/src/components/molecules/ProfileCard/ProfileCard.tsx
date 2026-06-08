import { Pencil } from 'lucide-react'
import { ProfileAvatar } from '@/components/atoms'

interface ProfileCardProps {
  id: string
  name: string
  avatarUrl?: string
  color?: string
  isAddButton?: boolean
  isEditing?: boolean
  onClick?: () => void
  onEdit?: () => void
}

export function ProfileCard({
  name,
  avatarUrl,
  color,
  isAddButton = false,
  isEditing = false,
  onClick,
  onEdit,
}: ProfileCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col items-center gap-4 cursor-pointer"
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
            ${!isAddButton ? 'group-hover:border-white group-hover:scale-105' : ''}
          `}
        />

        {isEditing && !isAddButton && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="
              absolute -top-2 -right-2
              w-10 h-10 rounded-full
              bg-white/10 backdrop-blur-sm border-2 border-white/20
              flex items-center justify-center
              hover:bg-white/20 hover:border-white/40
              transition-all duration-200
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
          `}
        >
          {name}
        </h3>
      </div>
    </div>
  )
}
