import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clapperboard, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { Button, Input, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { createSeriesEpisodeBatch, getCatalogDetail, getCatalogSeasons } from '@/lib/catalogo-api'
import type { CatalogSeason, CreateSeriesEpisodePayload } from '@/types/catalog'

interface EpisodeDraft {
  numero: string
  titulo: string
  sinopsis: string
  duracion_minutos: string
  url_video: string
}

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
  const [existingSeasons, setExistingSeasons] = useState<CatalogSeason[]>([])
  const [editingSeasonId, setEditingSeasonId] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function bootstrap() {
      if (!id) {
        setFeedback({ type: 'error', message: 'No se indico la serie a gestionar.' })
        setIsLoading(false)
        return
      }

      try {
        const [detail, seasons] = await Promise.all([
          getCatalogDetail(id),
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
  }, [id])

  const existingSeasonNumbers = useMemo(
    () => new Set(existingSeasons.map((season) => season.numero)),
    [existingSeasons],
  )

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
      {
        ...EMPTY_EPISODE,
        numero: String(current.length + 1),
      },
    ])
  }

  function removeEpisode(index: number) {
    setEpisodes((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)))
  }

  function resetForm(nextSeasonNumber?: number) {
    setEditingSeasonId('')
    setSeasonTitle('')
    setSeasonDescription('')
    setEpisodes([{ ...EMPTY_EPISODE }])
    if (nextSeasonNumber) {
      setSeasonNumber(String(nextSeasonNumber))
    }
  }

  function loadSeasonIntoForm(season: CatalogSeason) {
    setEditingSeasonId(season.id)
    setSeasonNumber(String(season.numero))
    setSeasonTitle(season.titulo ?? '')
    setSeasonDescription(season.descripcion ?? '')
    setEpisodes(mapSeasonEpisodesToDrafts(season))
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

    const payloadEpisodes: CreateSeriesEpisodePayload[] = []
    for (const episode of episodes) {
      const numero = Number(episode.numero)
      const duracion = Number(episode.duracion_minutos)
      if (!Number.isFinite(numero) || numero <= 0) {
        setFeedback({ type: 'error', message: 'Cada episodio debe tener un numero valido.' })
        return
      }
      if (!episode.titulo.trim()) {
        setFeedback({ type: 'error', message: 'Cada episodio debe incluir titulo.' })
        return
      }
      if (!Number.isFinite(duracion) || duracion <= 0) {
        setFeedback({ type: 'error', message: 'Cada episodio debe incluir una duracion valida en minutos.' })
        return
      }
      if (!episode.url_video.trim()) {
        setFeedback({ type: 'error', message: 'Cada episodio debe incluir la URL del video.' })
        return
      }

      payloadEpisodes.push({
        numero,
        titulo: episode.titulo.trim(),
        sinopsis: episode.sinopsis.trim(),
        duracion_minutos: duracion,
        url_video: episode.url_video.trim(),
      })
    }

    setIsSaving(true)
    setFeedback(null)

    try {
      await createSeriesEpisodeBatch(session.accessToken, id, {
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
                    <div className="md:col-span-2">
                      <Input
                        label="URL del video *"
                        type="url"
                        placeholder="https://..."
                        value={episode.url_video}
                        onChange={(event) => updateEpisode(index, 'url_video', event.target.value)}
                        required
                      />
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
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando...
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
