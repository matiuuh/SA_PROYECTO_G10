import { useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from '../MediaCard'

export interface ContentItem {
  id: string
  title: string
  genre: string
  year: number
  rating: number | null
  posterUrl?: string
  isNew?: boolean
}

interface ContentRowProps {
  title: string
  items: ContentItem[]
  onSelectItem?: (item: ContentItem) => void
}

export function ContentRow({ title, items, onSelectItem }: ContentRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-semibold text-white tracking-wide">{title}</h2>
        <span className="text-xs font-medium text-[var(--color-denim-400)] opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer hover:text-white">
          Ver todo →
        </span>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            aria-label="Desplazar izquierda"
            className="absolute left-0 top-0 bottom-0 z-20 w-14 flex items-center justify-center bg-gradient-to-r from-[#080c14] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:from-[#0d1220]"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
              <ChevronLeft size={16} className="text-white" />
            </div>
          </button>
        )}

        <div
          ref={trackRef}
          onScroll={updateArrows}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-3 px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className="shrink-0 w-[220px] sm:w-[260px] md:w-[300px]"
            >
              <MediaCard {...item} onClick={() => onSelectItem?.(item)} />
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            aria-label="Desplazar derecha"
            className="absolute right-0 top-0 bottom-0 z-20 w-14 flex items-center justify-center bg-gradient-to-l from-[#080c14] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 hover:from-[#0d1220]"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
              <ChevronRight size={16} className="text-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
