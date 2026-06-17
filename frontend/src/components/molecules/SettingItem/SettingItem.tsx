import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface SettingItemProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  onClick?: () => void
  showArrow?: boolean
}

export function SettingItem({
  icon,
  title,
  description,
  action,
  onClick,
  showArrow = false,
}: SettingItemProps) {
  const isClickable = onClick || showArrow

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-4 p-4
        bg-white/[0.02] border border-white/[0.07] rounded-lg
        transition-all duration-200
        ${isClickable ? 'hover:bg-white/[0.05] hover:border-white/10 cursor-pointer' : ''}
      `}
    >
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium mb-0.5">{title}</h4>
        {description && (
          <p className="text-sm text-[var(--color-denim-400)] line-clamp-1">{description}</p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}

      {showArrow && (
        <ChevronRight className="flex-shrink-0 w-5 h-5 text-[var(--color-denim-400)]" />
      )}
    </div>
  )
}
