import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

type ArchitectureNodeProps = {
  title: string
  detail: string
  icon: ComponentType<LucideProps>
}

export function ArchitectureNode({ title, detail, icon: Icon }: ArchitectureNodeProps) {
  return (
    <div className="architecture-node">
      <Icon size={21} strokeWidth={1.8} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}
