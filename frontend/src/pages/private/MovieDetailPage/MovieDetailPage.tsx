import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Lock,
} from 'lucide-react'
import { ScrollReveal, Button } from '@/components/atoms'
import type { ContentItem } from '@/components/molecules'
import { MediaCard } from '@/components/molecules'
import { getActiveSession } from '@/lib/auth'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'

const MOVIE = {
  title: 'El Ultimo Horizonte',
  description:
    'En un futuro donde los limites entre la realidad y la simulacion se han difuminado, una exploradora descubre una senal que podria cambiar para siempre el destino de la humanidad. Un viaje epico hacia los confines del universo conocido, donde cada decision tiene consecuencias irreversibles.',
  genre: 'Ciencia ficcion',
  year: 2024,
  rating: 8.7,
  duration: '2h 18min',
  director: 'Alejandra Voss',
  cast: ['Marco Rivera', 'Irina Solano', 'Leo Tan', 'Vera Munoz'],
  tags: ['Accion', 'Aventura', 'Sci-Fi'],
  ageRating: '13+',
}

const RELATED: ContentItem[] = [
  { title: 'Mundos Paralelos', genre: 'Ciencia ficcion', year: 2024, rating: 8.1, isNew: true },
  { title: 'Frontera Oscura', genre: 'Accion', year: 2024, rating: 7.8, isNew: true },
  { title: 'El Detective', genre: 'Misterio', year: 2023, rating: 8.5 },
  { title: 'Cazadores de Sombras', genre: 'Fantasia', year: 2023, rating: 8.3 },
  { title: 'Tormenta Digital', genre: 'Thriller', year: 2024, rating: 7.4, isNew: true },
  { title: 'Codigo Rojo', genre: 'Accion', year: 2024, rating: 7.9, isNew: true },
]

export function MovieDetailPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [inList, setInList] = useState(false)
  const [liked, setLiked] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!session) return
      const status = await getSubscriptionStatusByAccount(session.account.id)
      setHasSubscription(status.tiene_suscripcion)
    }

    void loadSubscriptionStatus()
  }, [session])

  const handlePlay = () => {
    if (!hasSubscription) return
    setPlaying(true)
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      {playing && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-4"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(22,95,180,0.15) 0%, #000 100%)',
              }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20">
                <Film size={40} strokeWidth={1} className="text-[var(--color-denim-400)]" />
              </div>
              <p className="text-sm text-[var(--color-denim-400)]">Reproduccion en curso (demo)</p>
            </div>

            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                onClick={() => setMuted((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors duration-200 hover:bg-black/70"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors duration-200 hover:bg-black/70">
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => setPlaying(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors duration-200 hover:bg-black/70"
              >
                <X size={16} />
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-8 flex flex-col gap-3 px-8">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-1/3 rounded-full bg-[var(--color-denim-500)]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPlaying(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-colors duration-200 hover:bg-white/90"
                  >
                    <Pause size={18} fill="#080c14" strokeWidth={0} />
                  </button>
                  <span className="text-sm font-medium text-white">{MOVIE.title}</span>
                </div>
                <span className="text-xs text-[var(--color-denim-400)]">{MOVIE.duration}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-h-[70vh] w-full aspect-video overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% 30%, rgba(22,95,180,0.25) 0%, rgba(8,12,20,0.6) 60%, #080c14 100%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10">
            <Film size={48} strokeWidth={0.75} className="text-[var(--color-denim-700)]" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/30 to-transparent" />

        <button
          onClick={() => navigate(-1)}
          className="group absolute left-4 top-6 flex items-center gap-1.5 text-sm text-[var(--color-denim-300)] transition-colors duration-200 hover:text-white sm:left-8"
        >
          <ChevronLeft size={18} strokeWidth={1.75} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
          Volver
        </button>

        <div className="absolute bottom-8 left-4 right-4 flex flex-col gap-4 sm:left-8 sm:right-8 lg:left-16 lg:right-16">
          {!hasSubscription && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-medium uppercase tracking-wide text-[var(--color-denim-200)]">
              <Lock size={13} />
              Vista previa disponible. Activa un plan para reproducir completo.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {MOVIE.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md border border-[var(--color-denim-700)]/60 bg-[var(--color-denim-900)]/50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-denim-300)]"
              >
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-md border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
              {MOVIE.ageRating}
            </span>
          </div>

          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {MOVIE.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-denim-400)]">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--color-warning)]">
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
            {hasSubscription ? (
              <button
                onClick={handlePlay}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#080c14] shadow-lg shadow-black/40 transition-colors duration-200 hover:bg-white/90"
              >
                <Play size={17} fill="#080c14" strokeWidth={0} className="shrink-0" />
                Reproducir
              </button>
            ) : (
              <Link to="/subscription/plans">
                <Button className="gap-2">
                  <Lock size={16} />
                  Ver planes para reproducir
                </Button>
              </Link>
            )}

            <button
              onClick={() => setInList((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
                inList
                  ? 'border-[var(--color-denim-600)]/70 bg-[var(--color-denim-700)]/40 text-white'
                  : 'border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-300)] hover:bg-white/[0.10] hover:text-white'
              }`}
            >
              <Plus size={15} strokeWidth={inList ? 2.5 : 1.75} className={inList ? 'rotate-45' : ''} />
              {inList ? 'En mi lista' : 'Mi lista'}
            </button>

            <button
              onClick={() => setLiked((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                liked
                  ? 'border-[var(--color-denim-600)]/70 bg-[var(--color-denim-700)]/40 text-[var(--color-denim-300)]'
                  : 'border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] hover:bg-white/[0.10] hover:text-white'
              }`}
              aria-label="Me gusta"
            >
              <ThumbsUp size={15} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} />
            </button>

            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] transition-colors duration-200 hover:bg-white/[0.10] hover:text-white"
              aria-label="Compartir"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:flex-row lg:px-16">
        <div className="flex flex-1 flex-col gap-6">
          <ScrollReveal variant="fade-up">
            <p className="max-w-2xl text-base leading-relaxed text-[var(--color-denim-300)]">
              {MOVIE.description}
            </p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={60}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Director</span>
                <span className="text-sm text-white">{MOVIE.director}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Genero</span>
                <span className="text-sm text-white">{MOVIE.genre}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Ano</span>
                <span className="text-sm text-white">{MOVIE.year}</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={100}>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Reparto principal</span>
              <div className="flex flex-wrap gap-2">
                {MOVIE.cast.map((actor) => (
                  <span
                    key={actor}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-1 text-sm text-[var(--color-denim-300)]"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
          <ScrollReveal variant="fade-up" delay={80}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">
              Calificacion
            </h3>
            <div className="rounded-xl border border-white/[0.06] bg-[#0d1220] p-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold leading-none text-white">{MOVIE.rating.toFixed(1)}</span>
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
            </div>
          </ScrollReveal>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:px-16">
        <ScrollReveal variant="fade-up">
          <h2 className="mb-5 text-lg font-semibold text-white">Tambien te puede gustar</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
