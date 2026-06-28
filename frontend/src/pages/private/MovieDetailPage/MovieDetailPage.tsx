import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  Rewind,
  FastForward,
  X,
  Film,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Lock,
  Users,
  Crown,
  Download,
} from 'lucide-react'
import { ScrollReveal, Button } from '@/components/atoms'
import type { ContentItem } from '@/components/molecules'
import { MediaCard } from '@/components/molecules'
import { PinModal } from '@/components/organisms'
import { getActiveSession, getStoredActiveProfile, isAdminRole, syncStoredActiveProfile } from '@/lib/auth'
import { dislikeCatalogContent, getAdminCatalogDetail, getCatalogDetail, getCatalogSeasons, likeCatalogContent, listCatalogContent } from '@/lib/catalogo-api'
import { isInMyList, toggleMyListItem } from '@/lib/my-list'
import { hasDownload, saveDownload } from '@/lib/offline-downloads'
import { getEpisodeSignedUrl, getPlaybackProgress, getTrailerSignedUrl, updatePlaybackProgress } from '@/lib/streaming-api'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import { createSala } from '@/lib/watchparty-api'
import { getProfileRestrictions, verifyProfilePin } from '@/lib/usuario-api'
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

  return { type: 'video', src: normalized }
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

const PREMIUM_PLAN_ID = 'b0000000-0000-0000-0000-000000000003'

export function MovieDetailPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const requestedEpisodeId = searchParams.get('episode')?.trim() ?? ''
  const shouldAutoplay = searchParams.get('autoplay') === '1'
  const isAdminView = searchParams.get('admin') === '1'
  const shouldResumeFromQuery = searchParams.get('resume') === '1'
  const requestedStartSeconds = parseRequestedStart(searchParams.get('start'))
  const session = getActiveSession()
  const isAdmin = session ? isAdminRole(session.account.rol) : false
  const activeProfile = getStoredActiveProfile()
  const activeProfileId = activeProfile?.id ?? ''
  const accountId = session?.account.id ?? ''
  const accessToken = session?.accessToken ?? ''
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [inList, setInList] = useState(false)
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string | null>(null)
  const [showPremiumAlert, setShowPremiumAlert] = useState(false)
  const [canDownload, setCanDownload] = useState(false)
  const [isLoadingPlanAccess, setIsLoadingPlanAccess] = useState(false)
  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [seasons, setSeasons] = useState<CatalogSeason[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('')
  const [related, setRelated] = useState<ContentItem[]>([])
  const [savedProgress, setSavedProgress] = useState<PlaybackProgress | null>(null)
  const [resumeFromSeconds, setResumeFromSeconds] = useState(0)
  const [trailerSignedUrl, setTrailerSignedUrl] = useState<string | null>(null)
  const [episodeSignedUrl, setEpisodeSignedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [shareFeedback, setShareFeedback] = useState('')
  const [downloadFeedback, setDownloadFeedback] = useState('')
  const [isSavingDownload, setIsSavingDownload] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [playbackPositionSeconds, setPlaybackPositionSeconds] = useState(0)
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(0)
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false)
  const [showPlaybackControls, setShowPlaybackControls] = useState(true)
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pendingPlaybackAction, setPendingPlaybackAction] = useState<{ type: 'play' | 'resume' | 'watchparty' } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const controlsHideTimeoutRef = useRef<number | null>(null)
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
      setIsLoadingPlanAccess(true)
      setCanDownload(false)

      try {
        const [status, profiles] = await Promise.all([
          getSubscriptionStatusByAccount(accountId),
          listProfiles(accessToken),
        ])
        setHasSubscription(status.tiene_suscripcion)
        setSubscriptionPlanId(status.suscripcion?.plan_id ?? null)
        setCanDownload(status.puede_descargar)

        if (status.tiene_suscripcion) {
          const syncedProfile = syncStoredActiveProfile(profiles)
          if (!syncedProfile) {
            navigate('/profiles', { replace: true, state: { reason: activeProfileId ? 'invalid-profile' : 'select-profile' } })
          }
        }
      } finally {
        setIsLoadingPlanAccess(false)
      }
    }

    void loadSubscriptionStatus()
  }, [accessToken, accountId, activeProfileId, navigate])

  useEffect(() => {
    async function checkStoredDownload() {
      if (!accountId || !activeProfileId || !detail) {
        setIsDownloaded(false)
        return
      }
      if (detail.tipo === 'serie' && !selectedEpisode?.id) {
        setIsDownloaded(false)
        return
      }

      try {
        setIsDownloaded(
          await hasDownload(accountId, activeProfileId, detail.id, selectedEpisode?.id),
        )
      } catch {
        setIsDownloaded(false)
      }
    }

    void checkStoredDownload()
  }, [accountId, activeProfileId, detail, selectedEpisode?.id])

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
        const detailRequest =
          isAdminView && isAdmin && accessToken
            ? getAdminCatalogDetail(accessToken, id)
            : getCatalogDetail(id)
        const [detailData, catalog] = await Promise.all([
          detailRequest,
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
  }, [accessToken, id, isAdmin, isAdminView, requestedEpisodeId])

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

  const playbackTotalSeconds = useMemo(() => {
    if (selectedEpisode?.duracion_minutos) return selectedEpisode.duracion_minutos * 60
    if (detail?.duracion_minutos) return detail.duracion_minutos * 60
    return 0
  }, [detail?.duracion_minutos, selectedEpisode?.duracion_minutos])

  const effectivePlaybackTotalSeconds = mediaDurationSeconds || playbackTotalSeconds
  const playbackProgressPercent =
    effectivePlaybackTotalSeconds > 0
      ? Math.max(0, Math.min(100, (playbackPositionSeconds / effectivePlaybackTotalSeconds) * 100))
      : 0

  const genres = detail?.generos ?? []
  const cast = detail?.reparto ?? []
  const technicalSheetMetadata = useMemo(() => parseTechnicalSheet(detail?.ficha_tecnica), [detail?.ficha_tecnica])
  const fallbackGenre = technicalSheetMetadata.get('genero') ?? ''
  const fallbackCast = technicalSheetMetadata.get('reparto') ?? ''
  const fallbackDirector = technicalSheetMetadata.get('director') ?? technicalSheetMetadata.get('creador') ?? ''
  const fallbackSubtitles = technicalSheetMetadata.get('subtitulos') ?? ''
  const fallbackSeasons = technicalSheetMetadata.get('temporadas') ?? ''
  const fallbackNotes = technicalSheetMetadata.get('notas') ?? ''
  const currentPlaybackUrl = (selectedEpisode ? episodeSignedUrl : null) || trailerSignedUrl || detail?.url_trailer
  const trailerSource = useMemo(
    () => resolveTrailerSource(currentPlaybackUrl, muted, resumeFromSeconds),
    [currentPlaybackUrl, muted, resumeFromSeconds],
  )

  const clearControlsHideTimer = () => {
    if (controlsHideTimeoutRef.current == null) return
    window.clearTimeout(controlsHideTimeoutRef.current)
    controlsHideTimeoutRef.current = null
  }

  const revealPlaybackControls = () => {
    setShowPlaybackControls(true)
    clearControlsHideTimer()

    if (!playing || isPlaybackPaused) return
    controlsHideTimeoutRef.current = window.setTimeout(() => {
      setShowPlaybackControls(false)
      controlsHideTimeoutRef.current = null
    }, 3000)
  }

  const RATING_HIERARCHY: Record<string, number> = { 'TP': 0, 'PG-13': 1, 'R': 2 }

  function ratingRequiresPin(contentRating: string | null | undefined, profileControl: string | null | undefined): boolean {
    if (!contentRating || !profileControl) return false
    const contentLevel = RATING_HIERARCHY[contentRating]
    const profileLevel = RATING_HIERARCHY[profileControl]
    if (contentLevel == null || profileLevel == null) return false
    return contentLevel > profileLevel
  }

  async function checkParentalRestriction(): Promise<boolean> {
    const contentRating = detail?.clasificacion_edad
    if (!contentRating) return false

    const profile = getStoredActiveProfile()
    if (!profile?.id || !accessToken) return false

    try {
      const restrictions = await getProfileRestrictions(accessToken, profile.id)
      if (!restrictions.tiene_pin || !restrictions.control_parental) return false
      return ratingRequiresPin(contentRating, restrictions.control_parental)
    } catch {
      return false
    }
  }

  async function startPlayback() {
    setResumeFromSeconds(0)
    setPlaybackPositionSeconds(0)
    setMediaDurationSeconds(0)
    setIsPlaybackPaused(false)
    setPlaybackStartedAt(Date.now())
    setPlaybackError('')
    setPlaying(true)
  }

  async function startResume() {
    const nextResumePoint = savedProgress?.progreso_segundos ?? 0
    setResumeFromSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
    setPlaybackPositionSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
    setIsPlaybackPaused(false)
    setPlaybackStartedAt(Date.now())
    setPlaybackError('')
    setPlaying(true)
  }

  async function handlePlayWithPinCheck(action: 'play' | 'resume') {
    if (isAdmin) {
      setPlaybackError('Los administradores no reproducen contenido desde la vista de usuario.')
      return
    }
    if (!hasSubscription) {
      setPlaybackError('Activa un plan para reproducir este contenido.')
      return
    }
    if (detail?.tipo === 'serie' && !selectedEpisode) {
      setPlaybackError('Selecciona un episodio para iniciar la reproduccion.')
      return
    }

    const restricted = await checkParentalRestriction()
    if (restricted) {
      setPendingPlaybackAction(action === 'play' ? { type: 'play' } : { type: 'resume' })
      setShowPinModal(true)
      return
    }

    if (action === 'play') {
      await startPlayback()
    } else {
      await startResume()
    }
  }

  async function handlePinVerify(pin: string): Promise<boolean> {
    const profile = getStoredActiveProfile()
    if (!profile?.id) return false

    const result = await verifyProfilePin(profile.id, { pin })
    if (result.valido) {
      setShowPinModal(false)
      if (pendingPlaybackAction?.type === 'play') {
        await startPlayback()
      } else if (pendingPlaybackAction?.type === 'resume') {
        await startResume()
      } else if (pendingPlaybackAction?.type === 'watchparty') {
        await handleWatchPartyAfterPin()
      }
      setPendingPlaybackAction(null)
    }
    return result.valido
  }

  function handlePinCancel() {
    setShowPinModal(false)
    setPendingPlaybackAction(null)
  }

  const resetPlaybackSelectionState = () => {
    setSavedProgress(null)
    setResumeFromSeconds(0)
    setPlaybackPositionSeconds(0)
    setMediaDurationSeconds(0)
    setIsPlaybackPaused(false)
    setShowPlaybackControls(true)
    setEpisodeSignedUrl(null)
    setPlaybackStartedAt(null)
    setPlaying(false)
  }

  useEffect(() => {
    if (!id || !hasSubscription) return
    void getTrailerSignedUrl(id).then((url) => {
      if (url) setTrailerSignedUrl(url)
    })
  }, [id, hasSubscription])

  useEffect(() => {
    if (!selectedEpisode?.url_video || !hasSubscription) {
      setEpisodeSignedUrl(null)
      return
    }
    setEpisodeSignedUrl(null)
    void getEpisodeSignedUrl(selectedEpisode.url_video).then((url) => {
      setEpisodeSignedUrl(url)
    })
  }, [selectedEpisode?.url_video, hasSubscription])

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
    if (!playing) {
      clearControlsHideTimer()
      setShowPlaybackControls(true)
      return
    }

    revealPlaybackControls()
    return clearControlsHideTimer
  }, [isPlaybackPaused, playing])

  useEffect(() => {
    if (!shouldAutoplay || hasConsumedAutoplayRef.current) return
    if (!hasSubscription || !detail) return
    if (detail.tipo === 'serie' && !selectedEpisode) return

    const nextResumePoint = shouldResumeFromQuery
      ? requestedStartSeconds
      : (savedProgress?.progreso_segundos ?? 0)

    hasConsumedAutoplayRef.current = true
    setResumeFromSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
    setPlaybackPositionSeconds(nextResumePoint > 0 ? nextResumePoint : 0)
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
    void handlePlayWithPinCheck('play')
  }

  const handleResume = () => {
    void handlePlayWithPinCheck('resume')
  }

  const handleDownload = async () => {
    setDownloadFeedback('')

    if (!hasSubscription) {
      setDownloadFeedback('Activa un plan Premium para descargar contenido.')
      return
    }
    if (isLoadingPlanAccess) {
      setDownloadFeedback('Validando tu Plan Premium. Intenta de nuevo en un momento.')
      return
    }
    if (!canDownload) {
      setDownloadFeedback('La descarga esta disponible unicamente para el Plan Premium.')
      return
    }
    if (!detail || !activeProfileId || !accountId) {
      setDownloadFeedback('No se pudo preparar la descarga para este perfil.')
      return
    }
    if (detail.tipo === 'serie' && !selectedEpisode) {
      setDownloadFeedback('Selecciona un episodio para descargar.')
      return
    }

    setIsSavingDownload(true)
    try {
      await saveDownload({
        accountId,
        profileId: activeProfileId,
        contentId: detail.id,
        title: detail.titulo,
        type: detail.tipo,
        episodeId: selectedEpisode?.id,
        episodeTitle: selectedEpisode?.titulo,
        posterUrl: detail.url_portada,
        downloadedAt: new Date().toISOString(),
      })
      setIsDownloaded(true)
      setDownloadFeedback(
        isDownloaded
          ? 'La descarga simulada se actualizo correctamente.'
          : 'Descarga simulada guardada localmente de forma cifrada.',
      )
    } catch {
      setDownloadFeedback('No se pudo guardar la descarga local.')
    } finally {
      setIsSavingDownload(false)
    }
  }

  const getCurrentVideoProgressSeconds = (): number | null => {
    const currentTime = videoRef.current?.currentTime
    if (currentTime == null || !Number.isFinite(currentTime) || currentTime < 0) return null
    return Math.floor(currentTime)
  }

  const getEstimatedPlaybackProgressSeconds = (): number => {
    const videoProgress = getCurrentVideoProgressSeconds()
    if (videoProgress != null) return videoProgress

    if (playbackStartedAt != null) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - playbackStartedAt) / 1000))
      return resumeFromSeconds + elapsedSeconds
    }

    return resumeFromSeconds
  }

  const persistPlaybackProgress = async (forceSeconds?: number) => {
    const currentProfile = getStoredActiveProfile()
    if (!hasSubscription || !currentProfile?.id || !detail?.id) return

    let nextProgress = forceSeconds ?? getEstimatedPlaybackProgressSeconds()

    if (!Number.isFinite(nextProgress) || nextProgress < 0) {
      return
    }

    if (effectivePlaybackTotalSeconds > 0 && nextProgress > effectivePlaybackTotalSeconds) {
      nextProgress = effectivePlaybackTotalSeconds
    }

    try {
      await updatePlaybackProgress({
        perfil_id: currentProfile.id,
        contenido_id: detail.id,
        episodio_id: selectedEpisode?.id ?? '',
        progreso_segundos: nextProgress,
        duracion_total_segundos: effectivePlaybackTotalSeconds,
      })
      setPlaybackPositionSeconds(nextProgress)

      if (nextProgress > 0) {
        setSavedProgress((prev) => ({
          id: prev?.id ?? '',
          perfil_id: currentProfile.id,
          contenido_id: detail.id,
          episodio_id: selectedEpisode?.id ?? '',
          estado:
            effectivePlaybackTotalSeconds > 0 && nextProgress >= effectivePlaybackTotalSeconds * 0.9
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

  const handleVideoTimeUpdate = () => {
    const videoProgress = getCurrentVideoProgressSeconds()
    if (videoProgress == null) return
    setPlaybackPositionSeconds(videoProgress)
  }

  const handleVideoLoadedMetadata = () => {
    const duration = videoRef.current?.duration
    if (duration == null || !Number.isFinite(duration) || duration <= 0) return
    setMediaDurationSeconds(Math.floor(duration))
  }

  const seekVideoTo = (seconds: number) => {
    const video = videoRef.current
    const safeSeconds = Math.max(0, Math.min(seconds, effectivePlaybackTotalSeconds || seconds))
    setPlaybackPositionSeconds(Math.floor(safeSeconds))
    setResumeFromSeconds(Math.floor(safeSeconds))

    if (video) {
      video.currentTime = safeSeconds
    }

    void persistPlaybackProgress(Math.floor(safeSeconds))
  }

  const handleSeekChange = (event: ChangeEvent<HTMLInputElement>) => {
    seekVideoTo(Number(event.target.value))
  }

  const handleSkip = (deltaSeconds: number) => {
    seekVideoTo(playbackPositionSeconds + deltaSeconds)
  }

  const handleTogglePlayback = async () => {
    const video = videoRef.current
    if (!video) {
      await closePlayback()
      return
    }

    if (video.paused) {
      await video.play()
      setIsPlaybackPaused(false)
      setPlaybackStartedAt(Date.now())
      return
    }

    video.pause()
    setIsPlaybackPaused(true)
    setPlaybackStartedAt(null)
  }

  const handleVideoSeeked = () => {
    const videoProgress = getCurrentVideoProgressSeconds()
    if (videoProgress == null) return
    void persistPlaybackProgress(videoProgress)
  }

  const handleVideoPause = () => {
    const videoProgress = getCurrentVideoProgressSeconds()
    if (videoProgress == null) return
    setIsPlaybackPaused(true)
    void persistPlaybackProgress(videoProgress)
  }

  const handleVideoEnded = () => {
    setIsPlaybackPaused(true)
    const finalProgress = effectivePlaybackTotalSeconds || getCurrentVideoProgressSeconds()
    if (finalProgress == null) return
    void persistPlaybackProgress(finalProgress)
  }

  const handleReaction = async (nextReaction: 'like' | 'dislike') => {
    if (isAdmin) {
      setPlaybackError('Las reacciones estan disponibles solo para usuarios con perfil.')
      return
    }

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
    if (isAdmin) {
      setPlaybackError('Mi lista esta disponible solo para usuarios con perfil.')
      return
    }

    if (!detail?.id) return

    const currentProfile = getStoredActiveProfile()
    if (!currentProfile?.id) {
      setPlaybackError('Debes seleccionar un perfil activo para guardar contenido en tu lista.')
      return
    }

    const result = toggleMyListItem(currentProfile.id, detail.id)
    setInList(result.inList)
    setPlaybackError('')
  }

  const handleShare = async () => {
    if (!detail) return

    const shareUrl = window.location.href
    setShareFeedback('')

    try {
      if (navigator.share) {
        await navigator.share({ title: detail.titulo, url: shareUrl })
        setShareFeedback('Enlace compartido.')
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      setShareFeedback('Enlace copiado.')
    } catch {
      setShareFeedback('No se pudo compartir el enlace.')
    }
  }

  const handleWatchParty = async () => {
    if (!detail || !activeProfile || !accountId) return
    if (subscriptionPlanId !== PREMIUM_PLAN_ID) {
      setShowPremiumAlert(true)
      return
    }
    const restricted = await checkParentalRestriction()
    if (restricted) {
      setPendingPlaybackAction({ type: 'watchparty' })
      setShowPinModal(true)
      return
    }
    try {
      const sala = await createSala({
        perfil_id: activeProfile.id,
        cuenta_id: accountId,
        contenido_id: detail.id,
        tipo_contenido: detail.tipo,
        duracion_segundos: (detail.duracion_minutos ?? 0) * 60,
      })
      navigate(`/watch-party?codigo=${sala.codigoInvite}`)
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Error al crear sala')
    }
  }

  const handleWatchPartyAfterPin = async () => {
    if (!detail || !activeProfile || !accountId) return
    try {
      const sala = await createSala({
        perfil_id: activeProfile.id,
        cuenta_id: accountId,
        contenido_id: detail.id,
        tipo_contenido: detail.tipo,
        duracion_segundos: (detail.duracion_minutos ?? 0) * 60,
      })
      navigate(`/watch-party?codigo=${sala.codigoInvite}`)
    } catch (err) {
      setPlaybackError(err instanceof Error ? err.message : 'Error al crear sala')
    }
  }

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await (playbackContainerRef.current ?? document.documentElement).requestFullscreen()
    } catch {
      setPlaybackError('No se pudo activar pantalla completa.')
    }
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

  const playbackChromeClass = showPlaybackControls
    ? 'opacity-100'
    : 'pointer-events-none opacity-0'

  return (
    <div className="min-h-screen bg-[#080c14]">
      {playing && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <div
            ref={playbackContainerRef}
            className={`relative flex h-full w-full items-center justify-center ${showPlaybackControls ? 'cursor-default' : 'cursor-none'}`}
            onMouseMove={revealPlaybackControls}
            onMouseDown={revealPlaybackControls}
            onTouchStart={revealPlaybackControls}
            onKeyDown={revealPlaybackControls}
            tabIndex={-1}
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/80 via-black/35 to-transparent transition-opacity duration-500 ${playbackChromeClass}`} />
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-opacity duration-500 ${playbackChromeClass}`} />

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
                autoPlay
                muted={muted}
                playsInline
                onLoadedMetadata={handleVideoLoadedMetadata}
                onTimeUpdate={handleVideoTimeUpdate}
                onSeeked={handleVideoSeeked}
                onPlay={() => setIsPlaybackPaused(false)}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
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

            <div className={`pointer-events-none absolute left-4 top-4 z-20 max-w-[calc(100%-12rem)] rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white shadow-2xl shadow-black/40 backdrop-blur-md transition-opacity duration-500 sm:left-6 ${playbackChromeClass}`}>
              <p className="truncate text-sm font-semibold">
                {selectedEpisode ? `${detail.titulo} - ${selectedEpisode.titulo}` : detail.titulo}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-denim-300)]">
                {selectedEpisode ? `Episodio ${selectedEpisode.numero}` : trailerSource ? 'Trailer' : 'Reproduccion'}
              </p>
            </div>

            <div className={`absolute right-4 top-4 z-30 flex items-center gap-2 transition-opacity duration-500 sm:right-6 ${playbackChromeClass}`}>
              <button
                onClick={() => setMuted((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl shadow-black/35 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/15"
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                onClick={() => {
                  void handleToggleFullscreen()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl shadow-black/35 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/15"
                aria-label="Pantalla completa"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => {
                  void closePlayback()
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl shadow-black/35 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-red-500/25"
                aria-label="Cerrar reproductor"
              >
                <X size={16} />
              </button>
            </div>

            <div className={`absolute inset-x-0 bottom-5 z-20 flex flex-col gap-3 px-4 transition-opacity duration-500 sm:bottom-6 sm:px-8 ${playbackChromeClass}`}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-white shadow-2xl shadow-black/30 backdrop-blur-md sm:px-4">
                <span className="w-12 text-right text-xs font-medium tabular-nums text-[var(--color-denim-200)]">
                  {formatProgress(playbackPositionSeconds)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(effectivePlaybackTotalSeconds, playbackPositionSeconds, 1)}
                  value={Math.min(playbackPositionSeconds, Math.max(effectivePlaybackTotalSeconds, playbackPositionSeconds, 1))}
                  onChange={handleSeekChange}
                  aria-label="Progreso de reproduccion"
                  className="h-1.5 flex-1 cursor-pointer rounded-full bg-white/20 accent-[var(--color-primary)]"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${playbackProgressPercent}%, rgba(255,255,255,0.22) ${playbackProgressPercent}%, rgba(255,255,255,0.22) 100%)`,
                  }}
                />
                <span className="w-12 text-xs font-medium tabular-nums text-[var(--color-denim-200)]">
                  {effectivePlaybackTotalSeconds > 0 ? formatProgress(effectivePlaybackTotalSeconds) : '--:--'}
                </span>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-white shadow-2xl shadow-black/30 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-all duration-200 hover:bg-white/20"
                    aria-label="Retroceder 10 segundos"
                  >
                    <Rewind size={17} />
                  </button>
                  <button
                    onClick={() => {
                      void handleTogglePlayback()
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#080c14] shadow-lg shadow-black/25 transition-transform duration-200 hover:scale-105 hover:bg-white/90"
                    aria-label={isPlaybackPaused ? 'Reproducir' : 'Pausar'}
                  >
                    {isPlaybackPaused ? (
                      <Play size={19} fill="#080c14" strokeWidth={0} />
                    ) : (
                      <Pause size={19} fill="#080c14" strokeWidth={0} />
                    )}
                  </button>
                  <button
                    onClick={() => handleSkip(10)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-all duration-200 hover:bg-white/20"
                    aria-label="Adelantar 10 segundos"
                  >
                    <FastForward size={17} />
                  </button>
                  <span className="ml-2 truncate text-sm font-semibold text-white">
                    {selectedEpisode ? `${detail.titulo} · ${selectedEpisode.titulo}` : detail.titulo}
                  </span>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 text-xs font-medium text-[var(--color-denim-300)] sm:justify-end">
                  <span>{selectedEpisode ? `Episodio ${selectedEpisode.numero}` : trailerSource ? 'Trailer' : 'Reproduccion'}</span>
                </div>
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

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="group absolute right-4 top-6 flex items-center gap-1.5 text-sm text-[var(--color-denim-300)] transition-colors duration-200 hover:text-white sm:right-8"
          >
            Ir a Admin
            <ChevronLeft size={18} strokeWidth={1.75} className="rotate-180 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )}

        <div className="absolute bottom-8 left-4 right-4 flex flex-col gap-4 sm:left-8 sm:right-8 lg:left-16 lg:right-16">
          {!hasSubscription && !isAdmin && (
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
            <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
              detail.clasificacion_edad === 'R'
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : detail.clasificacion_edad === 'PG-13'
                  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                  : detail.clasificacion_edad === 'TP'
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : 'border-white/20 text-white/60'
            }`}>
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

          {!isAdminView && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!isAdmin && hasSubscription && (
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
            )}
            {!isAdmin && !hasSubscription && (
              <Link to="/subscription/plans">
                <Button className="gap-2">
                  <Lock size={16} />
                  Ver planes para reproducir
                </Button>
              </Link>
            )}

            {!isAdmin && (
              <>
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
              </>
            )}

            <button
              onClick={() => {
                void handleShare()
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] transition-colors duration-200 hover:bg-white/[0.10] hover:text-white"
              aria-label="Compartir"
            >
              <Share2 size={15} strokeWidth={1.75} />
            </button>

            {hasSubscription && !isAdmin && (
              <button
                onClick={() => { void handleWatchParty() }}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] transition-colors duration-200 hover:bg-white/[0.10] hover:text-white"
                aria-label="Watch Party"
              >
                <Users size={15} strokeWidth={1.75} />
              </button>
            )}

            {hasSubscription && !isAdmin && (
              <button
                onClick={() => { void handleDownload() }}
                disabled={isSavingDownload}
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-200 ${
                  canDownload
                    ? 'border-white/[0.10] bg-white/[0.06] text-[var(--color-denim-400)] hover:bg-white/[0.10] hover:text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-[var(--color-denim-600)]'
                } ${isSavingDownload ? 'cursor-wait opacity-70' : ''}`}
                aria-label={canDownload ? (isDownloaded ? 'Actualizar descarga' : 'Descargar contenido') : 'Descarga disponible solo para Plan Premium'}
                title={isLoadingPlanAccess ? 'Validando plan' : canDownload ? (isDownloaded ? 'Contenido descargado' : 'Descargar contenido') : 'Solo Plan Premium'}
              >
                <Download size={15} strokeWidth={1.75} />
              </button>
            )}
          </div>
          )}

          {!isAdminView && playbackError ? (
            <p className="text-sm text-[var(--color-warning)]">{playbackError}</p>
          ) : null}
          {!isAdminView && shareFeedback ? (
            <p className="text-sm text-[var(--color-denim-300)]">{shareFeedback}</p>
          ) : null}
          {!isAdminView && downloadFeedback ? (
            <p className="text-sm text-[var(--color-denim-300)]">{downloadFeedback}</p>
          ) : null}
          {hasSubscription && !isAdminView ? (
            <div className={`max-w-md rounded-lg border px-4 py-3 text-sm ${
              canDownload
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                : 'border-amber-400/20 bg-amber-400/10 text-amber-100'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  canDownload ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
                }`}>
                  {canDownload ? <Download size={15} strokeWidth={1.8} /> : <Lock size={15} strokeWidth={1.8} />}
                </div>
                <div>
                  <p className="font-semibold">
                    Descargas solo para Plan Premium
                  </p>
                  <p className={`mt-1 text-xs ${canDownload ? 'text-emerald-100/75' : 'text-amber-100/75'}`}>
                    {canDownload
                      ? isDownloaded
                        ? 'Este contenido ya esta guardado para el perfil activo.'
                        : 'Tu plan permite guardar descargas simuladas de forma local y cifrada.'
                      : 'Actualiza a Premium para habilitar la descarga simulada de peliculas y episodios.'}
                  </p>
                </div>
              </div>
            </div>
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
                            setShareFeedback('')
                            resetPlaybackSelectionState()
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
                                setShareFeedback('')
                                resetPlaybackSelectionState()
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
                <span className={`text-sm font-semibold ${
                  detail.clasificacion_edad === 'R'
                    ? 'text-red-400'
                    : detail.clasificacion_edad === 'PG-13'
                      ? 'text-yellow-400'
                      : detail.clasificacion_edad === 'TP'
                        ? 'text-green-400'
                        : 'text-white'
                }`}>
                  {detail.clasificacion_edad
                    ? detail.clasificacion_edad === 'TP'
                      ? 'TP - Apta para todo publico'
                      : detail.clasificacion_edad === 'PG-13'
                        ? 'PG-13 - No recomendada para menores de 13'
                        : detail.clasificacion_edad === 'R'
                          ? 'R - Restringida, mayores de 18'
                          : detail.clasificacion_edad
                    : 'Sin clasificacion'}
                </span>
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

      {showPinModal && detail && (
        <PinModal
          titulo={detail.titulo}
          clasificacion={detail.clasificacion_edad}
          onVerify={handlePinVerify}
          onCancel={handlePinCancel}
        />
      )}

      {showPremiumAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl shadow-black/60">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
                  <Crown size={22} className="text-[var(--color-warning)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Plan Premium requerido</h2>
                  <p className="text-sm text-[var(--color-denim-400)]">
                    Solo los usuarios con plan Premium pueden crear Watch Parties.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPremiumAlert(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--color-denim-400)] transition-colors hover:text-white"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#080c14] p-4">
              <p className="text-sm leading-relaxed text-[var(--color-denim-300)]">
                Para crear una Watch Party necesitas tener el plan Premium activo.
                Si alguien ya te ha invitado, puedes unirte usando su codigo de invitacion sin necesidad de actualizar.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPremiumAlert(false)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.07]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPremiumAlert(false)
                  navigate('/subscription/manage')
                }}
                className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-opacity hover:opacity-90"
              >
                Actualizar plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
