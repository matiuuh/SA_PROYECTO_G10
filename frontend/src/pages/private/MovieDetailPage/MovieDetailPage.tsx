import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  ThumbsDown,
  Share2,
  Lock,
} from 'lucide-react'
import { ScrollReveal, Button } from '@/components/atoms'
import type { ContentItem } from '@/components/molecules'
import { MediaCard } from '@/components/molecules'
import { getActiveSession, getStoredActiveProfile, syncStoredActiveProfile } from '@/lib/auth'
import { dislikeCatalogContent, getCatalogDetail, getCatalogSeasons, likeCatalogContent, listCatalogContent } from '@/lib/catalogo-api'
import { isInMyList, toggleMyListItem } from '@/lib/my-list'
import { getPlaybackProgress, updatePlaybackProgress } from '@/lib/streaming-api'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import { listProfiles } from '@/lib/usuario-api'
import type { CatalogContent, CatalogDetail, CatalogEpisode, CatalogSeason } from '@/types/catalog'
import type { PlaybackProgress } from '@/types/streaming'

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function mapCatalogToContentItem(content: CatalogContent): ContentItem {
  const hasRecommendation = content.porcentaje_recomendacion > 0
  return {
    id: content.id,
    title: content.titulo,
    genre: content.tipo === 'serie' ? 'Serie' : 'Pelicula',
    year: getReleaseYear(content.fecha_lanzamiento),
    rating: hasRecommendation ? Math.max(0, Math.min(10, content.porcentaje_recomendacion / 10)) : null,
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

function resolveTrailerSource(
  url: string | undefined,
  muted: boolean,
  startSeconds: number,
): TrailerSource {
  const normalized = url?.trim() ?? ''
  if (!normalized) return null

  const youtubeId = extractYouTubeVideoId(normalized)
  if (youtubeId) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${muted ? '1' : '0'}&rel=0&modestbranding=1&playsinline=1&start=${Math.max(0, Math.floor(startSeconds))}`,
    }
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(normalized)) {
    return { type: 'video', src: normalized }
  }

  return null
}

function formatProgress(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function parseTechnicalSheet(sheet?: string): Map<string, string> {
  const metadata = new Map<string, string>()
  const source = sheet?.trim() ?? ''
  if (!source) return metadata

  for (const rawPart of source.split(/\n|\|/)) {
    const part = rawPart.trim()
    if (!part) continue
    const separatorIndex = part.indexOf(':')
    if (separatorIndex <= 0) continue
    const key = part.slice(0, separatorIndex).trim().toLowerCase()
    const value = part.slice(separatorIndex + 1).trim()
    if (value) {
      metadata.set(key, value)
    }
  }

  return metadata
}

function buildReactionStorageKey(profileId: string, contentId: string): string {
  return `quetzal_content_reaction:${profileId}:${contentId}`
}

function getInitialSelectedEpisode(seasons: CatalogSeason[]): CatalogEpisode | null {
  for (const season of seasons) {
    if (season.episodios.length > 0) {
      return season.episodios[0]
    }
  }
  return null
}

function parseRequestedStart(value: string | null): number {
  if (!value) return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.floor(parsed)
}

export function MovieDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const requestedEpisodeId = searchParams.get('episode')?.trim() ?? ''
  const shouldAutoplay = searchParams.get('autoplay') === '1'
  const shouldResumeFromQuery = searchParams.get('resume') === '1'
  const requestedStartSeconds = parseRequestedStart(searchParams.get('start'))
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const accountId = session?.account.id ?? ''
  const accessToken = session?.accessToken ?? ''
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [inList, setInList] = useState(false)
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [seasons, setSeasons] = useState<CatalogSeason[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('')
  const [related, setRelated] = useState<ContentItem[]>([])
  const [savedProgress, setSavedProgress] = useState<PlaybackProgress | null>(null)
  const [resumeFromSeconds, setResumeFromSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasConsumedAutoplayRef = useRef(false)

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) ?? null,
    [seasons, selectedSeasonId],
  )
  const selectedEpisode = useMemo(() => {
    if (selectedSeason) {
      return selectedSeason.episodios.find((episode) => episode.id === selectedEpisodeId) ?? null
    }

    for (const season of seasons) {
      const episode = season.episodios.find((currentEpisode) => currentEpisode.id === selectedEpisodeId)
      if (episode) return episode
    }

    return null
  }, [selectedEpisodeId, selectedSeason, seasons])

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!accountId || !accessToken) return
      const [status, profiles] = await Promise.all([
        getSubscriptionStatusByAccount(accessToken, accountId),
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
    async function loadSavedProgress() {
      if (!id || !hasSubscription) return

      const currentProfile = getStoredActiveProfile()
      if (!currentProfile?.id) return

      try {
        const progress = await getPlaybackProgress(currentProfile.id, id, selectedEpisode?.id ?? '')
        if (!progress || progress.progreso_segundos <= 0) {
          setSavedProgress(null)
          setResumeFromSeconds(0)
          return
        }

        setSavedProgress(progress)
        setResumeFromSeconds(progress.progreso_segundos)
      } catch (error) {
        setPlaybackError(
          error instanceof Error ? error.message : 'No se pudo recuperar el ultimo progreso guardado.',
        )
      }
    }

    void loadSavedProgress()
  }, [hasSubscription, id, selectedEpisode?.id])

  useEffect(() => {
    if (!id) return

    const currentProfile = getStoredActiveProfile()
    if (!currentProfile?.id) {
      setReaction(null)
      setInList(false)
      return
    }

    const storedReaction = localStorage.getItem(buildReactionStorageKey(currentProfile.id, id))
    setReaction(storedReaction === 'like' || storedReaction === 'dislike' ? storedReaction : null)
    setInList(isInMyList(currentProfile.id, id))
  }, [id])

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
        if (detailData.tipo === 'serie') {
          const loadedSeasons = await getCatalogSeasons(id)
          setSeasons(loadedSeasons)
          const requestedEpisode = requestedEpisodeId
            ? loadedSeasons
                .flatMap((season) => season.episodios)
                .find((episode) => episode.id === requestedEpisodeId) ?? null
            : null
          const initialEpisode = requestedEpisode ?? getInitialSelectedEpisode(loadedSeasons)
          setSelectedSeasonId(initialEpisode?.temporada_id ?? loadedSeasons[0]?.id ?? '')
          setSelectedEpisodeId(initialEpisode?.id ?? '')
        } else {
          setSeasons([])
          setSelectedSeasonId('')
          setSelectedEpisodeId('')
        }
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
  }, [id, requestedEpisodeId])

  const rating = useMemo(() => {
    if (!detail) return 0
    return Math.max(0, Math.min(10, detail.porcentaje_recomendacion / 10))
  }, [detail])
  const hasCommunityRecommendation = (detail?.total_likes ?? 0) + (detail?.total_dislikes ?? 0) > 0

  const duration = useMemo(() => {
    if (selectedEpisode?.duracion_minutos) {
      const episodeHours = Math.floor(selectedEpisode.duracion_minutos / 60)
      const episodeMinutes = selectedEpisode.duracion_minutos % 60
      if (episodeHours <= 0) return `${episodeMinutes}min`
      return `${episodeHours}h ${episodeMinutes}min`
    }
    if (!detail?.duracion_minutos) return 'Sin duracion registrada'
    const hours = Math.floor(detail.duracion_minutos / 60)
    const minutes = detail.duracion_minutos % 60
    if (hours <= 0) return `${minutes}min`
    return `${hours}h ${minutes}min`
  }, [detail, selectedEpisode])

  const genres = detail?.generos ?? []
  const cast = detail?.reparto ?? []
  const technicalSheetMetadata = useMemo(() => parseTechnicalSheet(detail?.ficha_tecnica), [detail?.ficha_tecnica])
  const fallbackGenre = technicalSheetMetadata.get('genero') ?? ''
  const fallbackCast = technicalSheetMetadata.get('reparto') ?? ''
  const fallbackDirector = technicalSheetMetadata.get('director') ?? technicalSheetMetadata.get('creador') ?? ''
  const fallbackSubtitles = technicalSheetMetadata.get('subtitulos') ?? ''
  const fallbackSeasons = technicalSheetMetadata.get('temporadas') ?? ''
  const fallbackNotes = technicalSheetMetadata.get('notas') ?? ''
  const currentPlaybackUrl = selectedEpisode?.url_video || detail?.url_trailer
  const trailerSource = useMemo(
    () => resolveTrailerSource(currentPlaybackUrl, muted, resumeFromSeconds),
    [currentPlaybackUrl, muted, resumeFromSeconds],
  )

  useEffect(() => {
    if (!playing) return
    if (trailerSource?.type !== 'video') return
    if (!videoRef.current) return
    if (resumeFromSeconds <= 0) return

    const video = videoRef.current
    const setCurrentTime = () => {
      try {
        video.currentTime = resumeFromSeconds
      } catch {
        // Ignore seek errors and keep default start.
      }
    }

    if (video.readyState >= 1) {
      setCurrentTime()
      return
    }

    video.addEventListener('loadedmetadata', setCurrentTime, { once: true })
    return () => video.removeEventListener('loadedmetadata', setCurrentTime)
  }, [playing, resumeFromSeconds, trailerSource])

  useEffect(() => {
    if (!shouldAutoplay || hasConsumedAutoplayRef.current) return
    if (!hasSubscription || !detail) return
    if (detail.tipo === 'serie' && !selectedEpisode) return

    const nextResumePoint = shouldResumeFromQuery
      ? requestedStartSeconds
      : (savedProgress?.progreso_segundos ?? 0)

    hasConsumedAutoplayRef.current = true
    setResumeFromSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
    setPlaybackStartedAt(Date.now())
    setPlaybackError('')
    setPlaying(true)
  }, [
    detail,
    hasSubscription,
    requestedStartSeconds,
    savedProgress?.progreso_segundos,
    selectedEpisode,
    shouldAutoplay,
    shouldResumeFromQuery,
  ])

  const handlePlay = () => {
    if (!hasSubscription) return
    if (detail?.tipo === 'serie' && !selectedEpisode) {
      setPlaybackError('Selecciona un episodio para iniciar la reproduccion.')
      return
    }
    setResumeFromSeconds(0)
    setPlaybackStartedAt(Date.now())
    setPlaybackError('')
    setPlaying(true)
  }

  const handleResume = () => {
    if (!hasSubscription) return
    if (detail?.tipo === 'serie' && !selectedEpisode) {
      setPlaybackError('Selecciona un episodio para reanudar la reproduccion.')
      return
    }
    const nextResumePoint = savedProgress?.progreso_segundos ?? 0
    setResumeFromSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
    setPlaybackStartedAt(Date.now())
    setPlaybackError('')
    setPlaying(true)
  }

  const persistPlaybackProgress = async (forceSeconds?: number) => {
    const currentProfile = getStoredActiveProfile()
    if (!hasSubscription || !currentProfile?.id || !detail?.id) return

    let nextProgress = forceSeconds ?? resumeFromSeconds

    if (forceSeconds == null && playbackStartedAt != null) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - playbackStartedAt) / 1000))
      nextProgress = resumeFromSeconds + elapsedSeconds
    }

    if (!Number.isFinite(nextProgress) || nextProgress < 0) {
      return
    }

    const totalDurationSeconds = selectedEpisode?.duracion_minutos
      ? selectedEpisode.duracion_minutos * 60
      : detail.duracion_minutos
        ? detail.duracion_minutos * 60
        : 0
    if (totalDurationSeconds > 0 && nextProgress > totalDurationSeconds) {
      nextProgress = totalDurationSeconds
    }

    try {
      await updatePlaybackProgress({
        perfil_id: currentProfile.id,
        contenido_id: detail.id,
        episodio_id: selectedEpisode?.id ?? '',
        progreso_segundos: nextProgress,
        duracion_total_segundos: totalDurationSeconds,
      })

      if (nextProgress > 0) {
        setSavedProgress((prev) => ({
          id: prev?.id ?? '',
          perfil_id: currentProfile.id,
          contenido_id: detail.id,
          episodio_id: selectedEpisode?.id ?? '',
          estado:
            totalDurationSeconds > 0 && nextProgress >= totalDurationSeconds * 0.9
              ? 'finalizado'
              : 'en_progreso',
          progreso_segundos: nextProgress,
          actualizado_en: new Date().toISOString(),
        }))
      }
    } catch (error) {
      setPlaybackError(
        error instanceof Error ? error.message : 'No se pudo guardar el progreso de reproduccion.',
      )
    }
  }

  const closePlayback = async () => {
    await persistPlaybackProgress()
    setPlaying(false)
    setPlaybackStartedAt(null)
  }

  const handleReaction = async (nextReaction: 'like' | 'dislike') => {
    if (!detail?.id || !accessToken) {
      setPlaybackError('Debes iniciar sesion para registrar tu reaccion.')
      return
    }

    const currentProfile = getStoredActiveProfile()
    if (!currentProfile?.id) {
      setPlaybackError('Debes seleccionar un perfil activo para registrar tu reaccion.')
      return
    }

    setIsSubmittingReaction(true)
    setPlaybackError('')

    try {
      const response =
        nextReaction === 'like'
          ? await likeCatalogContent(accessToken, detail.id, currentProfile.id)
          : await dislikeCatalogContent(accessToken, detail.id, currentProfile.id)
      localStorage.setItem(buildReactionStorageKey(currentProfile.id, detail.id), nextReaction)
      setReaction(nextReaction)
      setDetail((previous) =>
        previous
          ? {
              ...previous,
              total_likes: response.total_likes,
              total_dislikes: response.total_dislikes,
              porcentaje_recomendacion: response.porcentaje_recomendacion,
            }
          : previous,
      )
    } catch (error) {
      setPlaybackError(
        error instanceof Error
          ? error.message
          : `No se pudo registrar tu ${nextReaction === 'like' ? 'like' : 'dislike'} en este momento.`,
      )
    } finally {
      setIsSubmittingReaction(false)
    }
  }

  const handleToggleMyList = () => {
    if (!detail?.id) return

    const currentProfile = getStoredActiveProfile()
    if (!currentProfile?.id) {
      setPlaybackError('Debes seleccionar un perfil activo para guardar contenido en tu lista.')
      return
    }

    const result = toggleMyListItem(currentProfile.id, detail.id)
    setInList(result.inList)
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
                title={`${selectedEpisode ? `${selectedEpisode.titulo} · ` : ''}${detail.titulo}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : trailerSource?.type === 'video' ? (
              <video
                key={trailerSource.src}
                ref={videoRef}
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
                  Reproduccion en curso
                  {selectedEpisode ? ` · ${selectedEpisode.titulo}` : detail.url_trailer ? ' (vista previa del trailer)' : ' (demo)'}
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
                onClick={() => {
                  void closePlayback()
                }}
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
                    onClick={() => {
                      void closePlayback()
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white transition-colors duration-200 hover:bg-white/90"
                  >
                    <Pause size={18} fill="#080c14" strokeWidth={0} />
                  </button>
                  <span className="text-sm font-medium text-white">
                    {selectedEpisode ? `${detail.titulo} · ${selectedEpisode.titulo}` : detail.titulo}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-denim-400)]">
                  {selectedEpisode ? duration : trailerSource ? 'Trailer' : duration}
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
              <>
                {savedProgress?.progreso_segundos && savedProgress.progreso_segundos > 0 ? (
                  <>
                    <button
                      onClick={handleResume}
                      className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#080c14] shadow-lg shadow-black/40 transition-colors duration-200 hover:bg-white/90"
                    >
                      <Play size={17} fill="#080c14" strokeWidth={0} className="shrink-0" />
                      Reanudar desde {formatProgress(savedProgress.progreso_segundos)}
                    </button>
                    <Button variant="outline" onClick={handlePlay}>
                      {detail.tipo === 'serie' ? 'Ver episodio desde el inicio' : 'Ver desde el inicio'}
                    </Button>
                  </>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-[#080c14] shadow-lg shadow-black/40 transition-colors duration-200 hover:bg-white/90"
                  >
                    <Play size={17} fill="#080c14" strokeWidth={0} className="shrink-0" />
                    {detail.tipo === 'serie' ? 'Reproducir episodio' : 'Reproducir'}
                  </button>
                )}
              </>
            ) : (
              <Link to="/subscription/plans">
                <Button className="gap-2">
                  <Lock size={16} />
                  Ver planes para reproducir
                </Button>
              </Link>
            )}

            <button
              onClick={handleToggleMyList}
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
              onClick={() => {
                void handleReaction('like')
              }}
              disabled={isSubmittingReaction}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                reaction === 'like'
                  ? 'border-[var(--color-denim-600)]/70 bg-[var(--color-denim-700)]/40 text-[var(--color-denim-300)]'
                  : 'border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] hover:bg-white/[0.10] hover:text-white'
              } ${isSubmittingReaction ? 'cursor-wait opacity-70' : ''}`}
              aria-label={reaction === 'like' ? 'Contenido marcado con like' : 'Marcar contenido con like'}
            >
              <ThumbsUp size={15} strokeWidth={1.75} fill={reaction === 'like' ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={() => {
                void handleReaction('dislike')
              }}
              disabled={isSubmittingReaction}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                reaction === 'dislike'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : 'border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] hover:bg-white/[0.10] hover:text-white'
              } ${isSubmittingReaction ? 'cursor-wait opacity-70' : ''}`}
              aria-label={reaction === 'dislike' ? 'Contenido marcado con dislike' : 'Marcar contenido con dislike'}
            >
              <ThumbsDown size={15} strokeWidth={1.75} fill={reaction === 'dislike' ? 'currentColor' : 'none'} />
            </button>

            <button
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] transition-colors duration-200 hover:bg-white/[0.10] hover:text-white"
              aria-label="Compartir"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>
          </div>

          {playbackError ? (
            <p className="text-sm text-[var(--color-warning)]">{playbackError}</p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 lg:flex-row lg:px-16">
        <div className="flex flex-1 flex-col gap-6">
          {detail.tipo === 'serie' ? (
            <ScrollReveal variant="fade-up" delay={40}>
              <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-5">
                <div className="mb-4 flex flex-col gap-1">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-denim-300)]">
                    Episodios disponibles
                  </h3>
                  <p className="text-sm text-[var(--color-denim-500)]">
                    Selecciona una temporada y el capitulo que deseas reproducir.
                  </p>
                </div>

                {seasons.length === 0 ? (
                  <p className="text-sm text-[var(--color-denim-400)]">
                    Esta serie aun no tiene episodios registrados.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {seasons.map((season) => (
                        <button
                          key={season.id}
                          onClick={() => {
                            setSelectedSeasonId(season.id)
                            setSelectedEpisodeId(season.episodios[0]?.id ?? '')
                            setPlaybackError('')
                          }}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selectedSeasonId === season.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                              : 'border-white/[0.08] bg-white/[0.03] text-[var(--color-denim-300)] hover:bg-white/[0.07]'
                          }`}
                        >
                          T{season.numero}
                          {season.titulo ? ` · ${season.titulo}` : ''}
                        </button>
                      ))}
                    </div>

                    {selectedSeason ? (
                      <div className="space-y-3">
                        {selectedSeason.episodios.length === 0 ? (
                          <p className="text-sm text-[var(--color-denim-400)]">
                            Esta temporada aun no tiene episodios registrados.
                          </p>
                        ) : (
                          selectedSeason.episodios.map((episode) => (
                            <button
                              key={episode.id}
                              onClick={() => {
                                setSelectedEpisodeId(episode.id)
                                setPlaybackError('')
                                setPlaying(false)
                              }}
                              className={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                                selectedEpisodeId === episode.id
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                  : 'border-white/[0.06] bg-[#0a0f1c] hover:bg-white/[0.03]'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  Episodio {episode.numero}: {episode.titulo}
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-denim-400)]">
                                  {episode.sinopsis || 'Sin sinopsis registrada.'}
                                </p>
                              </div>
                              <span className="ml-4 shrink-0 text-xs text-[var(--color-denim-400)]">
                                {episode.duracion_minutos} min
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ) : null}

          <ScrollReveal variant="fade-up" delay={60}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Sinopsis</span>
                <span className="text-sm leading-relaxed text-white">
                  {detail.sinopsis || fallbackNotes || 'Sin sinopsis disponible.'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Genero</span>
                <span className="text-sm text-white">
                  {genres.length > 0 ? genres.map((genre) => genre.nombre).join(', ') : fallbackGenre || 'Sin genero'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">
                  {detail.tipo === 'serie' ? 'Creador' : 'Director'}
                </span>
                <span className="text-sm text-white">{fallbackDirector || 'Sin registro'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Idioma</span>
                <span className="text-sm text-white">{detail.idioma || 'Sin idioma'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Subtitulos</span>
                <span className="text-sm text-white">{fallbackSubtitles || 'Sin registro'}</span>
              </div>
              {detail.tipo === 'serie' ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Temporadas</span>
                  <span className="text-sm text-white">
                    {seasons.length > 0 ? String(seasons.length) : fallbackSeasons || 'Sin registro'}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Clasificacion</span>
                <span className="text-sm text-white">{detail.clasificacion_edad || 'Sin clasificacion'}</span>
              </div>
              {fallbackNotes ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2 lg:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">Notas adicionales</span>
                  <span className="text-sm text-white">{fallbackNotes}</span>
                </div>
              ) : null}
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
                )) : fallbackCast ? (
                  fallbackCast.split(',').map((actorName) => (
                    <span
                      key={actorName.trim()}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-1 text-sm text-[var(--color-denim-300)]"
                    >
                      {actorName.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--color-denim-400)]">Sin reparto registrado.</span>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
          <ScrollReveal variant="fade-up" delay={80}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-600)]">
              Recomendacion
            </h3>
            <div className="rounded-xl border border-white/[0.06] bg-[#0d1220] p-4">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold leading-none text-white">
                  {hasCommunityRecommendation ? `${Math.round(detail.porcentaje_recomendacion)}%` : 'N/D'}
                </span>
                <div className="flex flex-col gap-0.5 pb-1">
                  <div className="flex items-center gap-1 text-[var(--color-warning)]">
                    <ThumbsUp size={12} fill="currentColor" strokeWidth={0} />
                    <span className="text-xs font-semibold uppercase tracking-wide">Aprobacion global</span>
                  </div>
                  <span className="text-xs text-[var(--color-denim-500)]">
                    {hasCommunityRecommendation
                      ? `${detail.total_likes} like${detail.total_likes === 1 ? '' : 's'} y ${detail.total_dislikes} dislike${detail.total_dislikes === 1 ? '' : 's'} registrados`
                      : 'Sin recomendacion disponible todavia'}
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
