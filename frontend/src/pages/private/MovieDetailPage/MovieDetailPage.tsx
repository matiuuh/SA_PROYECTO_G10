import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Plus,
  Star,
  Clock,
  Calendar,
  ChevronLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Pause,
  X,
  Film,
  ThumbsUp,
  Share2,
} from 'lucide-react'
import { ScrollReveal } from '@/components/atoms'
import type { ContentItem } from '@/components/molecules'
import { MediaCard } from '@/components/molecules'

const MOVIE = {
  title: 'El Último Horizonte',
  description:
    'En un futuro donde los límites entre la realidad y la simulación se han difuminado, una exploradora descubre una señal que podría cambiar para siempre el destino de la humanidad. Un viaje épico hacia los confines del universo conocido, donde cada decisión tiene consecuencias irreversibles.',
  genre: 'Ciencia ficción',
  year: 2024,
  rating: 8.7,
  duration: '2h 18min',
  director: 'Alejandra Voss',
  cast: ['Marco Rivera', 'Irina Solano', 'Leo Tan', 'Vera Muñoz'],
  tags: ['Acción', 'Aventura', 'Sci-Fi'],
  ageRating: '13+',
}

const RELATED: ContentItem[] = [
  { title: 'Mundos Paralelos',     genre: 'Ciencia ficción', year: 2024, rating: 8.1, isNew: true },
  { title: 'Frontera Oscura',      genre: 'Acción',          year: 2024, rating: 7.8, isNew: true },
  { title: 'El Detective',         genre: 'Misterio',        year: 2023, rating: 8.5 },
  { title: 'Cazadores de Sombras', genre: 'Fantasía',        year: 2023, rating: 8.3 },
  { title: 'Tormenta Digital',     genre: 'Thriller',        year: 2024, rating: 7.4, isNew: true },
  { title: 'Código Rojo',          genre: 'Acción',          year: 2024, rating: 7.9, isNew: true },
]

export function MovieDetailPage() {
  const navigate              = useNavigate()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted]     = useState(false)
  const [inList, setInList]   = useState(false)
  const [liked, setLiked]     = useState(false)

  return (
    <div className="min-h-screen bg-[#080c14]">

      {playing && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(22,95,180,0.15) 0%, #000 100%)',
              }}
            >
              <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
                <Film size={40} strokeWidth={1} className="text-[var(--color-denim-400)]" />
              </div>
              <p className="text-[var(--color-denim-400)] text-sm">
                Reproducción en curso (demo)
              </p>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setMuted((v) => !v)}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-200"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-200"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => setPlaying(false)}
                className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors duration-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="absolute bottom-8 inset-x-0 px-8 flex flex-col gap-3">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-[var(--color-denim-500)] rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPlaying(false)}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors duration-200"
                  >
                    <Pause size={18} fill="#080c14" strokeWidth={0} />
                  </button>
                  <span className="text-white text-sm font-medium">{MOVIE.title}</span>
                </div>
                <span className="text-[var(--color-denim-400)] text-xs">{MOVIE.duration}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full aspect-video max-h-[70vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% 30%, rgba(22,95,180,0.25) 0%, rgba(8,12,20,0.6) 60%, #080c14 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center">
            <Film size={48} strokeWidth={0.75} className="text-[var(--color-denim-700)]" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/30 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 sm:left-8 flex items-center gap-1.5 text-sm text-[var(--color-denim-300)] hover:text-white transition-colors duration-200 group"
        >
          <ChevronLeft size={18} strokeWidth={1.75} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Volver
        </button>

        <div className="absolute bottom-8 left-4 sm:left-8 lg:left-16 right-4 sm:right-8 lg:right-16 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {MOVIE.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border border-[var(--color-denim-700)]/60 text-[var(--color-denim-300)] bg-[var(--color-denim-900)]/50"
              >
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold border border-white/20 text-white/60">
              {MOVIE.ageRating}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-2xl">
            {MOVIE.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-denim-400)]">
            <span className="flex items-center gap-1.5 text-[var(--color-warning)] font-semibold">
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {MOVIE.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} strokeWidth={1.75} />
              {MOVIE.year}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} strokeWidth={1.75} />
              {MOVIE.duration}
            </span>
            <span>{MOVIE.genre}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => setPlaying(true)}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-semibold bg-white text-[#080c14] hover:bg-white/90 transition-colors duration-200 shadow-lg shadow-black/40"
            >
              <Play size={17} fill="#080c14" strokeWidth={0} className="shrink-0" />
              Reproducir
            </button>

            <button
              onClick={() => setInList((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all duration-200 ${
                inList
                  ? 'bg-[var(--color-denim-700)]/40 border-[var(--color-denim-600)]/70 text-white'
                  : 'bg-white/[0.06] border-white/[0.10] text-[var(--color-denim-300)] hover:text-white hover:bg-white/[0.10]'
              }`}
            >
              <Plus size={15} strokeWidth={inList ? 2.5 : 1.75} className={inList ? 'rotate-45' : ''} />
              {inList ? 'En mi lista' : 'Mi lista'}
            </button>

            <button
              onClick={() => setLiked((v) => !v)}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-200 ${
                liked
                  ? 'bg-[var(--color-denim-700)]/40 border-[var(--color-denim-600)]/70 text-[var(--color-denim-300)]'
                  : 'bg-white/[0.06] border-white/[0.10] text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.10]'
              }`}
              aria-label="Me gusta"
            >
              <ThumbsUp size={15} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} />
            </button>

            <button
              className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.10] transition-colors duration-200"
              aria-label="Compartir"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-10 flex flex-col lg:flex-row gap-10">
        <div className="flex-1 flex flex-col gap-6">
          <ScrollReveal variant="fade-up">
            <p className="text-[var(--color-denim-300)] text-base leading-relaxed max-w-2xl">
              {MOVIE.description}
            </p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={60}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--color-denim-600)] uppercase tracking-widest font-semibold">Director</span>
                <span className="text-sm text-white">{MOVIE.director}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--color-denim-600)] uppercase tracking-widest font-semibold">Género</span>
                <span className="text-sm text-white">{MOVIE.genre}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--color-denim-600)] uppercase tracking-widest font-semibold">Año</span>
                <span className="text-sm text-white">{MOVIE.year}</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={100}>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-[var(--color-denim-600)] uppercase tracking-widest font-semibold">Reparto principal</span>
              <div className="flex flex-wrap gap-2">
                {MOVIE.cast.map((actor) => (
                  <span
                    key={actor}
                    className="px-3 py-1 rounded-lg text-sm bg-white/[0.05] border border-white/[0.07] text-[var(--color-denim-300)]"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
          <ScrollReveal variant="fade-up" delay={80}>
            <h3 className="text-xs text-[var(--color-denim-600)] uppercase tracking-widest font-semibold mb-1">
              Calificación
            </h3>
            <div className="flex items-end gap-3 p-4 rounded-xl bg-[#0d1220] border border-white/[0.06]">
              <span className="text-5xl font-bold text-white leading-none">{MOVIE.rating.toFixed(1)}</span>
              <div className="flex flex-col gap-0.5 pb-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      strokeWidth={0}
                      fill={i < Math.round(MOVIE.rating / 2) ? 'var(--color-warning)' : 'rgba(255,255,255,0.12)'}
                    />
                  ))}
                </div>
                <span className="text-xs text-[var(--color-denim-500)]">de 10 · miles de votos</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pb-16">
        <ScrollReveal variant="fade-up">
          <h2 className="text-lg font-semibold text-white mb-5">También te puede gustar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {RELATED.map((item, i) => (
              <ScrollReveal key={item.title} variant="fade-up" delay={i * 40}>
                <MediaCard {...item} />
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      </div>

    </div>
  )
}
