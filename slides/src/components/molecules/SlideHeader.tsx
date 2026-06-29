import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

type SlideHeaderProps = {
  eyebrow: string
  title: string
  summary: string
  icon: ComponentType<LucideProps>
}

export function SlideHeader({ eyebrow, title, summary, icon: Icon }: SlideHeaderProps) {
  return (
    <header className="content-slide-header">
      <div className="header-icon">
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{summary}</span>
      </div>
    </header>
  )
}
