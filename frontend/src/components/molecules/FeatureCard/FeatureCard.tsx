import type { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group flex flex-col gap-5 p-6 rounded-2xl bg-[#0d1220] border border-white/[0.07] hover:border-[var(--color-denim-600)]/60 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-denim-900)]/50">
      <div className="w-11 h-11 rounded-xl bg-[var(--color-denim-900)] border border-[var(--color-denim-800)] flex items-center justify-center text-[var(--color-denim-400)] group-hover:text-[var(--color-denim-300)] group-hover:border-[var(--color-denim-600)] transition-colors duration-300">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-sm text-[var(--color-denim-400)] leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
