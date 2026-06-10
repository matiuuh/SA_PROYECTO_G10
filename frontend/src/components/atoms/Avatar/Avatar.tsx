import { User } from 'lucide-react'

interface AvatarProps {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export function Avatar({ src, alt = 'User avatar', size = 'md', className = '' }: AvatarProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full overflow-hidden
        bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-denim-800)]
        flex items-center justify-center
        border-2 border-white/10
        ${className}
      `}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <User className="w-1/2 h-1/2 text-white/70" />
      )}
    </div>
  )
}
