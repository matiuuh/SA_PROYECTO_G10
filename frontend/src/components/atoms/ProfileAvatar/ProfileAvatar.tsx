import { User, Plus } from 'lucide-react'

interface ProfileAvatarProps {
  src?: string
  alt?: string
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isAddButton?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
}

const iconSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
}

const colorVariants = [
  'from-blue-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-teal-500 to-cyan-600',
]

export function ProfileAvatar({
  src,
  alt = 'Profile avatar',
  color,
  size = 'lg',
  isAddButton = false,
  className = '',
}: ProfileAvatarProps) {
  const gradientClass = color || colorVariants[0]

  if (isAddButton) {
    return (
      <div
        className={`
          ${sizeClasses[size]}
          rounded-lg overflow-hidden
          bg-white/5 border-2 border-white/20 border-dashed
          flex items-center justify-center
          transition-all duration-200
          hover:bg-white/10 hover:border-white/30
          ${className}
        `}
      >
        <Plus className={`${iconSizeClasses[size]} text-white/50`} />
      </div>
    )
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-lg overflow-hidden
        bg-gradient-to-br ${gradientClass}
        flex items-center justify-center
        border-4 border-transparent
        transition-all duration-200
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <User className={`${iconSizeClasses[size]} text-white`} />
      )}
    </div>
  )
}

export { colorVariants }
