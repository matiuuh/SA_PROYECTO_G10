import { Play, Star, Film, Plus } from 'lucide-react'

export interface MediaCardProps {
  title: string
  genre: string
  year: number
  rating: number
  posterUrl?: string
  isNew?: boolean
  onClick?: () => void
}

export function MediaCard({ title, genre, year, rating, posterUrl, isNew = false, onClick }: MediaCardProps) {
  return (
    <article
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-[#0d1220] border border-white/[0.06] hover:border-[var(--color-denim-700)]/70 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/70 cursor-pointer"
    >
      <div className="aspect-video w-full bg-[#0a0f1e] overflow-hidden">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center transition-colors duration-300 text-[var(--color-denim-800)] group-hover:text-[var(--color-denim-700)]"
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(22,95,180,0.10) 0%, transparent 100%)',
            }}
          >
            <Film size={32} strokeWidth={1} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
          <div className="w-11 h-11 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/25 transition-colors duration-200">
            <Play size={18} fill="white" strokeWidth={0} className="ml-0.5" />
          </div>
        </div>

        {isNew && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide bg-[var(--color-denim-600)] text-white uppercase">
              Nuevo
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          aria-label="Agregar a mi lista"
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--color-denim-700)] hover:border-[var(--color-denim-600)] transition-all duration-200"
        >
          <Plus size={13} className="text-white" />
        </button>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-white text-sm leading-tight line-clamp-1 flex-1">{title}</h3>
          <span className="shrink-0 flex items-center gap-0.5 text-[11px] text-[var(--color-warning)] font-semibold">
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {rating.toFixed(1)}
          </span>
        </div>
        <p className="text-[11px] text-[var(--color-denim-500)] mt-0.5">{genre} · {year}</p>
      </div>
    </article>
  )
}
