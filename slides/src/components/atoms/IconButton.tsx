import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

type IconButtonProps = {
  label: string
  icon: ComponentType<LucideProps>
  isActive?: boolean
  isDisabled?: boolean
  onClick?: () => void
}

export function IconButton({
  label,
  icon: Icon,
  isActive = false,
  isDisabled = false,
  onClick,
}: IconButtonProps) {
  return (
    <button
      className="icon-button"
      aria-label={label}
      aria-pressed={isActive}
      disabled={isDisabled}
      title={label}
      onClick={onClick}
    >
      <Icon size={18} strokeWidth={1.9} />
    </button>
  )
}
