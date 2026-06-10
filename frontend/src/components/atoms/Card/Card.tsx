import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated'
}

const variantClasses = {
  default: 'bg-[#0d1220] border border-white/[0.07]',
  bordered: 'bg-transparent border border-white/[0.12]',
  elevated: 'bg-[#0d1220] border border-white/[0.07] shadow-lg shadow-black/20',
}

export function Card({ variant = 'default', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
