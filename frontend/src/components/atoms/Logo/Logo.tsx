import { Clapperboard } from 'lucide-react'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-xl tracking-tight ${className}`}>
      <Clapperboard className="text-[var(--color-denim-400)]" size={22} strokeWidth={1.75} />
      <span className="text-white">Quetzal</span>
      <span className="text-[var(--color-denim-400)]">TV</span>
    </span>
  )
}
