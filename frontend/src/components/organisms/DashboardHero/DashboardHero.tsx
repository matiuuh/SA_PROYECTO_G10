import { useNavigate } from 'react-router-dom'
import { Play, Info, Star, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/atoms'
import { Badge } from '@/components/atoms'

interface DashboardHeroProps {
  id?: string
  title: string
  description: string
  genre: string
  year: number
  rating: number | null
  backdropUrl?: string
}

export function DashboardHero({
  id,
  title,
  description,
  genre,
  year,
  rating,
  backdropUrl,
}: DashboardHeroProps) {
  const navigate = useNavigate()
  return (
    <section className="relative h-[56vh] max-h-[580px] min-h-[380px] w-full overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0e19]">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={title}
            className="h-full w-full object-cover opacity-40"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 30% 40%, rgba(22,95,180,0.18) 0%, rgba(16,35,65,0.6) 50%, transparent 100%)',
            }}
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(8,12,20,0.96) 0%, rgba(8,12,20,0.60) 50%, rgba(8,12,20,0.10) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: 'linear-gradient(to top, #080c14 0%, transparent 100%)',
        }}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-12 sm:px-6 lg:px-8">
        <div className="max-w-xl animate-[fadeSlideUp_0.7s_ease-out_both]">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="info">Destacado</Badge>
            {rating != null ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-warning)]">
                <ThumbsUp size={11} fill="currentColor" strokeWidth={0} />
                {Math.round(rating * 10)}% de aprobacion
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--color-denim-400)]">
                <Star size={11} strokeWidth={1.75} />
                Sin recomendacion disponible
              </span>
            )}
            <span className="text-xs text-[var(--color-denim-400)]">{genre} · {year}</span>
          </div>

          <h1 className="mb-3 text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl">
            {title}
          </h1>

          <p className="mb-6 max-w-md line-clamp-3 text-sm leading-relaxed text-[var(--color-denim-300)]">
            {description}
          </p>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="md" className="gap-2" onClick={() => id && navigate(`/movie/${id}?autoplay=1`)}>
              <Play size={16} fill="currentColor" strokeWidth={0} />
              Reproducir
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="gap-2 border border-white/[0.12] hover:border-white/25 hover:bg-white/[0.06]"
              onClick={() => id && navigate(`/movie/${id}`)}
            >
              <Info size={16} strokeWidth={1.75} />
              Mas info
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
