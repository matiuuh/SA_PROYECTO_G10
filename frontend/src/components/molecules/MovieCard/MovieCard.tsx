import { Film, Star, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../atoms'

interface MovieCardProps {
  title: string
  genre: string
  year: number
  rating: number | null
  posterUrl?: string
  isNew?: boolean
}

export function MovieCard({ title, genre, year, rating, posterUrl, isNew = false }: MovieCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="group relative rounded-xl overflow-hidden bg-[#0d1220] border border-white/[0.07] hover:border-[var(--color-denim-600)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60">
      <div className="aspect-[2/3] w-full bg-[#111827] overflow-hidden">
        {posterUrl && !imageFailed ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-denim-700)] group-hover:text-[var(--color-denim-600)] transition-colors duration-300">
            <Film size={40} strokeWidth={1.25} />
          </div>
        )}
      </div>

      {isNew && (
        <div className="absolute top-3 left-3">
          <Badge variant="success">Nuevo</Badge>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{title}</h3>
          {rating != null ? (
            <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-[var(--color-warning)]">
              <ThumbsUp size={11} fill="currentColor" strokeWidth={0} />
              {Math.round(rating * 10)}%
            </span>
          ) : (
            <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-[var(--color-denim-500)]">
              <Star size={11} strokeWidth={1.75} />
              N/D
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-denim-400)]">{genre} · {year}</p>
      </div>
    </article>
  )
}
