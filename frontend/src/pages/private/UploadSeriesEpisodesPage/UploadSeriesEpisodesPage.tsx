import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clapperboard, Film, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { Button, Input, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { createSeriesEpisodeBatch, getAdminCatalogDetail, getCatalogSeasons, getUploadEpisodeVideoUrl } from '@/lib/catalogo-api'
import type { CatalogSeason, CreateSeriesEpisodePayload } from '@/types/catalog'

interface EpisodeDraft {
  numero: string
  titulo: string
  sinopsis: string
  duracion_minutos: string
  url_video: string
}

type EpisodeUploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; objectName: string }
  | { phase: 'error'; message: string }

type FeedbackState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

const EMPTY_EPISODE: EpisodeDraft = {
  numero: '1',
  titulo: '',
  sinopsis: '',
  duracion_minutos: '',
  url_video: '',
}

function mapSeasonEpisodesToDrafts(season: CatalogSeason): EpisodeDraft[] {
  if (season.episodios.length === 0) {
    return [{ ...EMPTY_EPISODE }]
  }

  return season.episodios.map((episode) => ({
    numero: String(episode.numero),
    titulo: episode.titulo,
    sinopsis: episode.sinopsis ?? '',
    duracion_minutos: String(episode.duracion_minutos),
    url_video: episode.url_video,
  }))
}

export function UploadSeriesEpisodesPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const session = getActiveSession()
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seasonNumber, setSeasonNumber] = useState('1')
  const [seasonTitle, setSeasonTitle] = useState('')
  const [seasonDescription, setSeasonDescription] = useState('')
  const [episodes, setEpisodes] = useState<EpisodeDraft[]>([{ ...EMPTY_EPISODE }])
  const [episodeUploadStates, setEpisodeUploadStates] = useState<EpisodeUploadState[]>([{ phase: 'idle' }])
  const [episodeFiles, setEpisodeFiles] = useState<(File | null)[]>([null])
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [existingSeasons, setExistingSeasons] = useState<CatalogSeason[]>([])
  const [editingSeasonId, setEditingSeasonId] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const isAnyUploading = episodeUploadStates.some((s) => s.phase === 'uploading')

  useEffect(() => {
    async function bootstrap() {
      if (!id) {
        setFeedback({ type: 'error', message: 'No se indico la serie a gestionar.' })
        setIsLoading(false)
        return
      }

      try {
        if (!session?.accessToken) {
          setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa. Inicia sesion nuevamente.' })
          setIsLoading(false)
          return
        }
        const [detail, seasons] = await Promise.all([
          getAdminCatalogDetail(session.accessToken, id),
          getCatalogSeasons(id),
        ])
        setSeriesTitle(detail.titulo)
        setExistingSeasons(seasons)
        const nextSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((season) => season.numero)) + 1 : 1
        setSeasonNumber(String(nextSeasonNumber))
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'No se pudo cargar la serie.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [id, session?.accessToken])

  const existingSeasonNumbers = useMemo(
    () => new Set(existingSeasons.map((season) => season.numero)),
    [existingSeasons],
  )

  function setEpisodeUploadState(index: number, state: EpisodeUploadState) {
    setEpisodeUploadStates((current) =>
      current.map((s, i) => (i === index ? state : s)),
    )
  }

  function updateEpisode(index: number, field: keyof EpisodeDraft, value: string) {
    setEpisodes((current) =>
      current.map((episode, episodeIndex) =>
        episodeIndex === index ? { ...episode, [field]: value } : episode,
      ),
    )
  }

  function addEpisode() {
    setEpisodes((current) => [
      ...current,
      { ...EMPTY_EPISODE, numero: String(current.length + 1) },
    ])
    setEpisodeUploadStates((current) => [...current, { phase: 'idle' }])
    setEpisodeFiles((current) => [...current, null])
  }

  function removeEpisode(index: number) {
    if (episodes.length === 1) return
    setEpisodes((current) => current.filter((_, i) => i !== index))
    setEpisodeUploadStates((current) => current.filter((_, i) => i !== index))
    setEpisodeFiles((current) => current.filter((_, i) => i !== index))
  }

  function handleFileSelect(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setEpisodeUploadState(index, { phase: 'error', message: 'Solo se aceptan archivos de video (mp4, webm, etc.).' })
      return
    }
    setEpisodeFiles((current) => current.map((f, i) => (i === index ? file : f)))
    setEpisodeUploadState(index, { phase: 'idle' })
  }

  async function uploadEpisodeToGCS(token: string, episodeKey: string, file: File, index: number): Promise<string> {
    setEpisodeUploadState(index, { phase: 'uploading', progress: 0 })
    try {
      const { upload_url, object_name } = await getUploadEpisodeVideoUrl(token, episodeKey)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', 'video/mp4')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setEpisodeUploadState(index, { phase: 'uploading', progress: Math.round((event.loaded / event.total) * 100) })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Error al subir el archivo: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el video.'))
        xhr.send(file)
      })

      setEpisodeUploadState(index, { phase: 'done', objectName: object_name })
      return object_name
    } catch (error) {
      setEpisodeUploadState(index, {
        phase: 'error',
        message: error instanceof Error ? error.message : 'No se pudo subir el video.',
      })
      throw error
    }
  }

  function resetForm(nextSeasonNumber?: number) {
    setEditingSeasonId('')
    setSeasonTitle('')
    setSeasonDescription('')
    setEpisodes([{ ...EMPTY_EPISODE }])
    setEpisodeUploadStates([{ phase: 'idle' }])
    setEpisodeFiles([null])
    if (nextSeasonNumber) {
      setSeasonNumber(String(nextSeasonNumber))
    }
  }

  function loadSeasonIntoForm(season: CatalogSeason) {
    setEditingSeasonId(season.id)
    setSeasonNumber(String(season.numero))
    setSeasonTitle(season.titulo ?? '')
    setSeasonDescription(season.descripcion ?? '')
    const drafts = mapSeasonEpisodesToDrafts(season)
    setEpisodes(drafts)
    setEpisodeUploadStates(drafts.map((d) => (d.url_video ? { phase: 'done', objectName: d.url_video } : { phase: 'idle' })))
    setEpisodeFiles(drafts.map(() => null))
    setFeedback(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!session?.accessToken) {
      setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa. Inicia sesion nuevamente.' })
      return
    }

    const parsedSeasonNumber = Number(seasonNumber)
    if (!Number.isFinite(parsedSeasonNumber) || parsedSeasonNumber <= 0) {
      setFeedback({ type: 'error', message: 'Debes indicar una temporada valida.' })
      return
    }

    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i]
      const uploadState = episodeUploadStates[i]
      const numero = Number(episode.numero)
      const duracion = Number(episode.duracion_minutos)
      if (!Number.isFinite(numero) || numero <= 0) {
        setFeedback({ type: 'error', message: `Episodio ${i + 1}: numero invalido.` })
        return
      }
      if (!episode.titulo.trim()) {
        setFeedback({ type: 'error', message: `Episodio ${i + 1}: falta el titulo.` })
        return
      }
      if (!Number.isFinite(duracion) || duracion <= 0) {
        setFeedback({ type: 'error', message: `Episodio ${i + 1}: duracion invalida.` })
        return
      }
      const hasFile = Boolean(episodeFiles[i])
      const hasDoneUrl = uploadState.phase === 'done'
      if (!hasFile && !hasDoneUrl) {
        setFeedback({ type: 'error', message: `Episodio ${i + 1}: sube el archivo de video.` })
        return
      }
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      const token = session.accessToken
      const resolvedUrls: string[] = []

      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i]
        const file = episodeFiles[i]
        const uploadState = episodeUploadStates[i]

        if (file) {
          const episodeKey = `${id}-s${parsedSeasonNumber}-e${episode.numero}`
          const objectName = await uploadEpisodeToGCS(token, episodeKey, file, i)
          resolvedUrls.push(objectName)
        } else if (uploadState.phase === 'done') {
          resolvedUrls.push(uploadState.objectName)
        } else {
          resolvedUrls.push(episode.url_video)
        }
      }

      const payloadEpisodes: CreateSeriesEpisodePayload[] = episodes.map((episode, i) => ({
        numero: Number(episode.numero),
        titulo: episode.titulo.trim(),
        sinopsis: episode.sinopsis.trim(),
        duracion_minutos: Number(episode.duracion_minutos),
        url_video: resolvedUrls[i],
      }))

      await createSeriesEpisodeBatch(token, id, {
        numero_temporada: parsedSeasonNumber,
        titulo_temporada: seasonTitle.trim() || undefined,
        descripcion_temporada: seasonDescription.trim() || undefined,
        episodios: payloadEpisodes,
      })

      const seasons = await getCatalogSeasons(id)
      setExistingSeasons(seasons)
      setFeedback({
        type: 'success',
        message: existingSeasonNumbers.has(parsedSeasonNumber)
          ? 'Temporada actualizada correctamente con los episodios enviados.'
          : 'Temporada y episodios registrados correctamente.',
      })
      const nextSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map((season) => season.numero)) + 1 : 1
      resetForm(nextSeasonNumber)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudieron guardar los episodios.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-5xl items-center justify-center px-4 py-8 text-white sm:px-6 lg:px-8">
        Cargando estructura de la serie...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <ScrollReveal variant="fade-up">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/15">
            <Clapperboard size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Capitulos de serie</h2>
            <p className="text-xs text-[var(--color-denim-500)]">
              {seriesTitle ? `Gestionando: ${seriesTitle}` : 'Carga por lote de temporadas y episodios.'}
            </p>
          </div>
        </div>
      </ScrollReveal>

      {feedback && (
        <ScrollReveal variant="fade-up">
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : 'border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedback.message}
          </div>
        </ScrollReveal>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Numero de temporada *"
                type="number"
                min="1"
                value={seasonNumber}
                onChange={(event) => setSeasonNumber(event.target.value)}
                required
              />
              <Input
                label="Titulo de temporada"
                value={seasonTitle}
                onChange={(event) => setSeasonTitle(event.target.value)}
              />
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Descripcion de temporada</label>
                <textarea
                  rows={3}
                  value={seasonDescription}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setSeasonDescription(event.target.value)}
                  className="w-full resize-none rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>
              {editingSeasonId ? (
                <div className="md:col-span-2 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-denim-200)]">
                  Editando la temporada {seasonNumber}. Los cambios que guardes actualizaran los episodios ya registrados.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-denim-200)]">
                  {editingSeasonId ? 'Episodios cargados para editar' : 'Episodios a cargar'}
                </h3>
                <p className="text-xs text-[var(--color-denim-500)]">
                  {editingSeasonId
                    ? 'Los campos muestran los datos guardados de la temporada seleccionada.'
                    : 'Puedes registrar varios capitulos de una temporada en un solo envio.'}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={addEpisode}>
                <Plus size={14} />
                Agregar episodio
              </Button>
            </div>

            <div className="space-y-4">
              {episodes.map((episode, index) => (
                <div key={`episode-${index}`} className="rounded-xl border border-white/[0.07] bg-[#0d1220] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Episodio {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeEpisode(index)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                      Quitar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Numero *"
                      type="number"
                      min="1"
                      value={episode.numero}
                      onChange={(event) => updateEpisode(index, 'numero', event.target.value)}
                      required
                    />
                    <Input
                      label="Duracion (min) *"
                      type="number"
                      min="1"
                      value={episode.duracion_minutos}
                      onChange={(event) => updateEpisode(index, 'duracion_minutos', event.target.value)}
                      required
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Titulo *"
                        value={episode.titulo}
                        onChange={(event) => updateEpisode(index, 'titulo', event.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-denim-200)]">Sinopsis</label>
                      <textarea
                        rows={3}
                        value={episode.sinopsis}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateEpisode(index, 'sinopsis', event.target.value)}
                        className="w-full resize-none rounded-lg border border-white/[0.07] bg-[#09101d] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-denim-200)]">Video del episodio *</label>
                      <div className="flex flex-col gap-2 rounded-lg border border-white/[0.07] bg-[#09101d] p-3">
                        {episodeUploadStates[index]?.phase === 'done' ? (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 size={15} className="shrink-0 text-[var(--color-success)]" />
                            <span className="truncate text-[var(--color-denim-300)]">
                              {(episodeUploadStates[index] as { phase: 'done'; objectName: string }).objectName}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEpisodeUploadState(index, { phase: 'idle' })
                                setEpisodeFiles((current) => current.map((f, i) => (i === index ? null : f)))
                              }}
                              className="ml-auto shrink-0 text-[var(--color-denim-500)] hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : episodeUploadStates[index]?.phase === 'uploading' ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary)]" />
                              Subiendo al bucket... {(episodeUploadStates[index] as { phase: 'uploading'; progress: number }).progress}%
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200"
                                style={{ width: `${(episodeUploadStates[index] as { phase: 'uploading'; progress: number }).progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {episodeFiles[index] ? (
                              <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                                <Film size={14} className="shrink-0" />
                                <span className="truncate">{episodeFiles[index]!.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setEpisodeFiles((current) => current.map((f, i) => (i === index ? null : f)))}
                                  className="ml-auto shrink-0 text-[var(--color-denim-500)] hover:text-white"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--color-denim-500)]">
                                Selecciona un archivo .mp4 para subir al bucket de GCS.
                              </p>
                            )}
                            {episodeUploadStates[index]?.phase === 'error' && (
                              <p className="text-xs text-[var(--color-error)]">
                                {(episodeUploadStates[index] as { phase: 'error'; message: string }).message}
                              </p>
                            )}
                            <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.10] hover:text-white">
                              <Upload size={12} />
                              Elegir archivo
                              <input
                                ref={(el) => { fileInputRefs.current[index] = el }}
                                type="file"
                                accept="video/mp4,video/webm,video/*"
                                className="sr-only"
                                onChange={(event) => handleFileSelect(index, event)}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/admin/catalog')}>
              Volver al catalogo
            </Button>
            {editingSeasonId ? (
              <Button type="button" variant="ghost" onClick={() => resetForm()}>
                Crear nueva temporada
              </Button>
            ) : null}
            <Button type="submit" disabled={isSaving || isAnyUploading}>
              {isSaving || isAnyUploading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isAnyUploading ? 'Subiendo videos...' : 'Guardando...'}
                </span>
              ) : (
                <>
                  <Save size={15} />
                  {editingSeasonId ? 'Actualizar capitulos' : 'Guardar capitulos'}
                </>
              )}
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-white">Temporadas registradas</h3>
            <div className="mt-4 space-y-3">
              {existingSeasons.length === 0 ? (
                <p className="text-sm text-[var(--color-denim-400)]">Todavia no hay temporadas cargadas.</p>
              ) : (
                existingSeasons.map((season) => (
                  <div key={season.id} className="rounded-lg border border-white/[0.06] bg-[#0d1220] p-4">
                    <p className="text-sm font-semibold text-white">
                      Temporada {season.numero}
                      {season.titulo ? ` · ${season.titulo}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-denim-400)]">
                      {season.episodios.length} episodio{season.episodios.length === 1 ? '' : 's'}
                    </p>
                    <div className="mt-3">
                      <Button type="button" variant="ghost" onClick={() => loadSeasonIntoForm(season)}>
                        <Pencil size={14} />
                        Cargar para editar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
