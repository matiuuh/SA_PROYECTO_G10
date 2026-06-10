type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-[var(--color-success-light)] text-[var(--color-success-dark)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning-dark)]',
  error:   'bg-[var(--color-error-light)]   text-[var(--color-error-dark)]',
  info:    'bg-[var(--color-info-light)]    text-[var(--color-info-dark)]',
  default: 'bg-[var(--color-denim-100)]     text-[var(--color-denim-800)]',
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
