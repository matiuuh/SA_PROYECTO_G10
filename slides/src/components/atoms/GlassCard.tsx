import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

type GlassCardProps = {
  title: string
  body: string
  icon: ComponentType<LucideProps>
  accent?: 'gold' | 'aqua' | 'violet'
}

export function GlassCard({ title, body, icon: Icon, accent = 'gold' }: GlassCardProps) {
  return (
    <article className="glass-card" data-accent={accent}>
      <span className="glass-card-icon">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

type DetailCardProps = {
  children: ReactNode
}

export function DetailCard({ children }: DetailCardProps) {
  return <article className="detail-card">{children}</article>
}
