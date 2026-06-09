import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, Film, History, Play, Tv2 } from 'lucide-react'
import { Button, Card, ScrollReveal } from '@/components/atoms'
import { getStoredActiveProfile } from '@/lib/auth'
import { listCatalogContent, getCatalogSeasons } from '@/lib/catalogo-api'
import { getPlaybackHistory } from '@/lib/streaming-api'
import type { CatalogContent, CatalogEpisode, CatalogSeason } from '@/types/catalog'
import type { PlaybackProgress } from '@/types/streaming'

interface HistoryEntryView {
  history: PlaybackProgress
  content: CatalogContent | null
  episodeTitle: string
}

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
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

function formatUpdatedAt(date: string): string {
  return new Date(date).toLocaleString('es-GT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildResumeTarget(
  contentId: string,
  episodeId: string,
  progressSeconds: number,
): string {
  const params = new URLSearchParams()

  if (episodeId) {
    params.set('episode', episodeId)
  }

  if (progressSeconds > 0) {
    params.set('autoplay', '1')
    params.set('resume', '1')
    params.set('start', String(Math.max(0, Math.floor(progressSeconds))))
  }

  const query = params.toString()
  return `/movie/${contentId}${query ? `?${query}` : ''}`
}

export function HistoryPage() {
  const navigate = useNavigate()
  const activeProfile = getStoredActiveProfile()
  const [history, setHistory] = useState<PlaybackProgress[]>([])
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [episodeMap, setEpisodeMap] = useState<Map<string, CatalogEpisode>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadHistory() {
      if (!activeProfile?.id) {
        navigate('/profiles', { replace: true, state: { reason: 'select-profile' } })
        return
      }

      try {
        const [historyData, catalogData] = await Promise.all([
          getPlaybackHistory(activeProfile.id, 20),
          listCatalogContent(),
        ])

        setHistory(historyData)
        setCatalog(catalogData)

        const seriesIdsWithEpisodes = Array.from(
          new Set(
            historyData
              .filter((entry) => entry.episodio_id)
              .map((entry) => entry.contenido_id),
          ),
        )

        if (seriesIdsWithEpisodes.length > 0) {
          const seasonsPerSeries = await Promise.all(
            seriesIdsWithEpisodes.map(async (contentId) => ({
              contentId,
              seasons: await getCatalogSeasons(contentId).catch(() => [] as CatalogSeason[]),
            })),
          )

          const nextEpisodeMap = new Map<string, CatalogEpisode>()
          for (const item of seasonsPerSeries) {
            for (const season of item.seasons) {
              for (const episode of season.episodios) {
                nextEpisodeMap.set(episode.id, episode)
              }
            }
          }
          setEpisodeMap(nextEpisodeMap)
        } else {
          setEpisodeMap(new Map())
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'No se pudo mostrar el historial de reproduccion.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadHistory()
  }, [activeProfile?.id, navigate])

  const historyItems = useMemo<HistoryEntryView[]>(() => {
    return history.map((entry) => {
      const content = catalog.find((item) => item.id === entry.contenido_id) ?? null
      const episode = entry.episodio_id ? episodeMap.get(entry.episodio_id) : undefined

      return {
        history: entry,
        content,
        episodeTitle: episode?.titulo ?? '',
      }
    })
  }, [catalog, episodeMap, history])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-white">
        Cargando historial...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[var(--color-denim-300)] transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver</span>
        </button>

        <ScrollReveal variant="fade-up">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/15">
              <History size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Historial de reproduccion</h1>
              <p className="text-sm text-[var(--color-denim-400)]">
                {activeProfile
                  ? `Perfil activo: ${activeProfile.nombre}. Aqui se muestran solo sus reproducciones recientes.`
                  : 'Consulta los contenidos vistos recientemente.'}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {errorMessage ? (
          <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {historyItems.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0d1220]">
              <History size={28} strokeWidth={1.25} className="text-[var(--color-denim-700)]" />
            </div>
            <h2 className="text-xl font-semibold text-white">Aun no existe historial reciente</h2>
            <p className="mt-2 text-sm text-[var(--color-denim-400)]">
              Cuando empieces a reproducir peliculas o series con este perfil, apareceran aqui para continuar viendo.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/panel')}>Ir al catalogo</Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5">
            {historyItems.map((item, index) => {
              const contentTypeLabel = item.content?.tipo === 'serie' ? 'Serie' : 'Pelicula'
              const contentYear = item.content ? getReleaseYear(item.content.fecha_lanzamiento) : null
              const navigateTarget = buildResumeTarget(
                item.history.contenido_id,
                item.history.episodio_id,
                item.history.progreso_segundos,
              )

              return (
                <ScrollReveal key={item.history.id} variant="fade-up" delay={index * 40}>
                  <Card className="overflow-hidden p-0">
                    <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                      <div className="relative min-h-[220px] bg-[#0d1220]">
                        {item.content?.url_portada ? (
                          <img
                            src={item.content.url_portada}
                            alt={item.content.titulo}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film size={36} className="text-[var(--color-denim-700)]" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-between p-6">
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md border border-[var(--color-denim-700)]/60 bg-[var(--color-denim-900)]/50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-denim-300)]">
                              {item.content?.tipo === 'serie' ? (
                                <Tv2 size={12} className="mr-1" />
                              ) : (
                                <Film size={12} className="mr-1" />
                              )}
                              {contentTypeLabel}
                            </span>
                            <span className="rounded-md border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
                              {item.history.estado === 'finalizado' ? 'Finalizado' : 'En progreso'}
                            </span>
                            {contentYear ? (
                              <span className="text-xs text-[var(--color-denim-500)]">{contentYear}</span>
                            ) : null}
                          </div>

                          <h2 className="text-2xl font-bold text-white">
                            {item.content?.titulo ?? 'Contenido no disponible'}
                          </h2>

                          {item.episodeTitle ? (
                            <p className="mt-2 text-sm font-medium text-[var(--color-denim-200)]">
                              Episodio: {item.episodeTitle}
                            </p>
                          ) : null}

                          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--color-denim-400)]">
                            {item.content?.sinopsis || 'Sin descripcion disponible para este contenido.'}
                          </p>
                        </div>

                        <div className="mt-6 flex flex-col gap-4">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Progreso guardado</p>
                              <p className="mt-2 text-lg font-semibold text-white">
                                {formatProgress(item.history.progreso_segundos)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Ultima actividad</p>
                              <p className="mt-2 text-sm font-semibold text-white">
                                {formatUpdatedAt(item.history.actualizado_en)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-wide text-[var(--color-denim-500)]">Perfil</p>
                              <p className="mt-2 text-sm font-semibold text-white">
                                {activeProfile?.nombre ?? 'Perfil activo'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Button onClick={() => navigate(navigateTarget)}>
                              <Play size={15} />
                              {item.history.estado === 'finalizado' ? 'Ver de nuevo' : 'Reanudar'}
                            </Button>
                            <button
                              onClick={() => navigate(`/movie/${item.history.contenido_id}`)}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm font-medium text-[var(--color-denim-300)] transition-colors duration-200 hover:bg-white/[0.10] hover:text-white"
                            >
                              <Clock3 size={15} />
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </ScrollReveal>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
