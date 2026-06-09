import { Play, Info, Star } from 'lucide-react'
import { Button } from '@/components/atoms'
import { Badge } from '@/components/atoms'

interface DashboardHeroProps {
  title: string
  description: string
  genre: string
  year: number
  rating: number
  backdropUrl?: string
}

export function DashboardHero({
  title,
  description,
  genre,
  year,
  rating,
  backdropUrl,
}: DashboardHeroProps) {
  return (
    <section className="relative w-full h-[56vh] min-h-[380px] max-h-[580px] overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0e19]">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover opacity-40"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(22,95,180,0.18) 0%, rgba(16,35,65,0.6) 50%, transparent 100%)',
            }}
          />
        )}
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(8,12,20,0.96) 0%, rgba(8,12,20,0.60) 50%, rgba(8,12,20,0.10) 100%)',
        }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #080c14 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10 h-full flex items-end pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-xl animate-[fadeSlideUp_0.7s_ease-out_both]">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="info">Destacado</Badge>
            <span className="flex items-center gap-1 text-xs text-[var(--color-warning)] font-semibold">
              <Star size={11} fill="currentColor" strokeWidth={0} />
              {rating.toFixed(1)}
            </span>
            <span className="text-xs text-[var(--color-denim-400)]">{genre} · {year}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
            {title}
          </h1>

          <p className="text-sm text-[var(--color-denim-300)] mb-6 leading-relaxed line-clamp-3 max-w-md">
            {description}
          </p>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" className="gap-2">
              <Play size={16} fill="currentColor" strokeWidth={0} />
              Reproducir
            </Button>
            <Button variant="ghost" size="md" className="gap-2 border border-white/[0.12] hover:border-white/25 hover:bg-white/[0.06]">
              <Info size={16} strokeWidth={1.75} />
              Más info
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
