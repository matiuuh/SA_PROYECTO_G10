import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/atoms'

interface ConfirmationCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  variant?: 'success' | 'info' | 'warning'
  children?: React.ReactNode
}

const variantStyles = {
  success: {
    iconBg: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20',
    iconColor: 'text-[var(--color-success)]',
  },
  info: {
    iconBg: 'bg-[var(--color-info)]/10 border-[var(--color-info)]/20',
    iconColor: 'text-[var(--color-info)]',
  },
  warning: {
    iconBg: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
    iconColor: 'text-[var(--color-warning)]',
  },
}

export function ConfirmationCard({
  title,
  description,
  icon,
  variant = 'success',
  children,
}: ConfirmationCardProps) {
  const styles = variantStyles[variant]
  const defaultIcon = <CheckCircle2 size={40} strokeWidth={1.5} />

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border mb-6 ${styles.iconBg}`}>
        <div className={styles.iconColor}>
          {icon || defaultIcon}
        </div>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      {description && (
        <p className="text-[var(--color-denim-300)] mb-8">{description}</p>
      )}
      {children && (
        <Card className="p-8 text-left">
          {children}
        </Card>
      )}
    </div>
  )
}
