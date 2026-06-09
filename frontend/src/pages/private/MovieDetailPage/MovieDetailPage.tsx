import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { getActiveSession, getStoredActiveProfile, syncStoredActiveProfile } from '@/lib/auth'
import { getCatalogDetail, listCatalogContent } from '@/lib/catalogo-api'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import { listProfiles } from '@/lib/usuario-api'
import type { CatalogContent, CatalogDetail } from '@/types/catalog'

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function mapCatalogToContentItem(content: CatalogContent): ContentItem {
  return {
    id: content.id,
    title: content.titulo,
    genre: content.tipo === 'serie' ? 'Serie' : 'Pelicula',
    year: getReleaseYear(content.fecha_lanzamiento),
    rating: Math.max(0, Math.min(10, content.porcentaje_recomendacion / 10)),
    posterUrl: content.url_portada,
    isNew: getReleaseYear(content.fecha_lanzamiento) >= new Date().getFullYear() - 1,
  }
}

type TrailerSource =
  | { type: 'youtube'; src: string }
  | { type: 'video'; src: string }
  | null

function extractYouTubeVideoId(url: string): string | null {
  const normalized = url.trim()
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }

      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2]
        return id || null
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2]
        return id || null
      }
    }
  } catch {
    return null
  }

  return null
}

function resolveTrailerSource(url: string | undefined, muted: boolean): TrailerSource {
  const normalized = url?.trim() ?? ''
  if (!normalized) return null

  const youtubeId = extractYouTubeVideoId(normalized)
  if (youtubeId) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${muted ? '1' : '0'}&rel=0&modestbranding=1&playsinline=1`,
    }
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(normalized)) {
    return { type: 'video', src: normalized }
  }

  return null
}

export function MovieDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const accountId = session?.account.id ?? ''
  const accessToken = session?.accessToken ?? ''
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [inList, setInList] = useState(false)
  const [liked, setLiked] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [related, setRelated] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!accountId || !accessToken) return
      const [status, profiles] = await Promise.all([
        getSubscriptionStatusByAccount(accountId),
        listProfiles(accessToken),
      ])
      setHasSubscription(status.tiene_suscripcion)

      if (status.tiene_suscripcion) {
        const syncedProfile = syncStoredActiveProfile(profiles)
        if (!syncedProfile) {
          navigate('/profiles', { replace: true, state: { reason: activeProfile ? 'invalid-profile' : 'select-profile' } })
        }
      }
    }

    void loadSubscriptionStatus()
  }, [accessToken, accountId, activeProfile, navigate])

  useEffect(() => {
    async function loadDetail() {
      if (!id) {
        setErrorMessage('No se indico el contenido a consultar.')
        setIsLoading(false)
        return
      }

      try {
        const [detailData, catalog] = await Promise.all([
          getCatalogDetail(id),
          listCatalogContent(),
        ])
        setDetail(detailData)
        setRelated(
          catalog
            .filter((content) => content.id !== id)
            .slice(0, 6)
            .map(mapCatalogToContentItem),
        )
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el detalle del contenido.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()
  }, [id])

  const rating = useMemo(() => {
    if (!detail) return 0
    return Math.max(0, Math.min(10, detail.porcentaje_recomendacion / 10))
  }, [detail])

  const duration = useMemo(() => {
    if (!detail?.duracion_minutos) return 'Sin duracion registrada'
    const hours = Math.floor(detail.duracion_minutos / 60)
    const minutes = detail.duracion_minutos % 60
    if (hours <= 0) return `${minutes}min`
    return `${hours}h ${minutes}min`
  }, [detail])

  const genres = detail?.generos ?? []
  const cast = detail?.reparto ?? []
  const trailerSource = useMemo(
    () => resolveTrailerSource(detail?.url_trailer, muted),
    [detail?.url_trailer, muted],
  )

  const handlePlay = () => {
    if (!hasSubscription) return
    setPlaying(true)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-white">
        Cargando detalle del contenido...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#080c14] px-4 text-center">
        <p className="text-2xl font-semibold text-white">No fue posible mostrar el contenido.</p>
        <p className="max-w-xl text-sm text-[var(--color-denim-400)]">
          {errorMessage || 'El contenido solicitado no esta disponible en este momento.'}
        </p>
        <Button onClick={() => navigate('/panel')}>Volver al catalogo</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      {playing && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div className="relative flex h-full w-full items-center justify-center">
            {trailerSource?.type === 'youtube' ? (
              <iframe
                key={trailerSource.src}
                src={trailerSource.src}
                title={`Trailer de ${detail.titulo}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : trailerSource?.type === 'video' ? (
              <video
                key={trailerSource.src}
                src={trailerSource.src}
                className="h-full w-full bg-black"
                controls
                autoPlay
                muted={muted}
              />
            ) : (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-4"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(22,95,180,0.15) 0%, #000 100%)',
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20">
                  <Film size={40} strokeWidth={1} className="text-[var(--color-denim-400)]" />
                </div>
                <p className="text-sm text-[var(--color-denim-400)]">
                  Reproduccion en curso ({detail.url_trailer ? 'vista previa del trailer' : 'demo'})
                </p>
              </div>
            )}

            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                onClick={() => setMuted((value) => !value)}
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
                  <span className="text-sm font-medium text-white">{detail.titulo}</span>
                </div>
                <span className="text-xs text-[var(--color-denim-400)]">
                  {trailerSource ? 'Trailer' : duration}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-h-[70vh] w-full aspect-video overflow-hidden">
        {detail.url_portada ? (
          <img
            src={detail.url_portada}
            alt={detail.titulo}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% 30%, rgba(22,95,180,0.25) 0%, rgba(8,12,20,0.6) 60%, #080c14 100%)',
          }}
        />

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
            {(genres.length > 0 ? genres.map((genre) => genre.nombre) : [detail.tipo === 'serie' ? 'Serie' : 'Pelicula']).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md border border-[var(--color-denim-700)]/60 bg-[var(--color-denim-900)]/50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-denim-300)]"
              >
                {tag}
              </span>
            ))}
            <span className="inline-flex items-center rounded-md border border-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
              {detail.clasificacion_edad || 'Sin clasificacion'}
            </span>
          </div>

          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {detail.titulo}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-denim-400)]">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--color-warning)]">
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} strokeWidth={1.75} />
              {getReleaseYear(detail.fecha_lanzamiento)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} strokeWidth={1.75} />
              {duration}
            </span>
            <span>{detail.tipo === 'serie' ? 'Serie' : 'Pelicula'}</span>
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
              onClick={() => setInList((value) => !value)}
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
              onClick={() => setLiked((value) => !value)}
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
              {detail.sinopsis || 'Sin sinopsis disponible.'}
            </p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={60}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Ficha tecnica</span>
                <span className="text-sm text-white">{detail.ficha_tecnica || 'Sin registro'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Genero</span>
                <span className="text-sm text-white">
                  {genres.length > 0 ? genres.map((genre) => genre.nombre).join(', ') : 'Sin genero'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Idioma</span>
                <span className="text-sm text-white">{detail.idioma || 'Sin idioma'}</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={100}>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Reparto principal</span>
              <div className="flex flex-wrap gap-2">
                {cast.length > 0 ? cast.map((actor) => (
                  <span
                    key={`${actor.id}-${actor.nombre_artistico}`}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-1 text-sm text-[var(--color-denim-300)]"
                  >
                    {actor.nombre_artistico}
                  </span>
                )) : (
                  <span className="text-sm text-[var(--color-denim-400)]">Sin reparto registrado.</span>
                )}
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
                <span className="text-5xl font-bold leading-none text-white">{rating.toFixed(1)}</span>
                <div className="flex flex-col gap-0.5 pb-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={12}
                        strokeWidth={0}
                        fill={index < Math.round(rating / 2) ? 'var(--color-warning)' : 'rgba(255,255,255,0.12)'}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--color-denim-500)]">
                    {detail.total_likes} likes y {detail.total_dislikes} dislikes
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:px-16">
          <ScrollReveal variant="fade-up">
            <h2 className="mb-5 text-lg font-semibold text-white">Tambien te puede gustar</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {related.map((item, index) => (
                <ScrollReveal key={item.id} variant="fade-up" delay={index * 40}>
                  <MediaCard {...item} onClick={() => navigate(`/movie/${item.id}`)} />
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </div>
      )}
    </div>
  )
}
