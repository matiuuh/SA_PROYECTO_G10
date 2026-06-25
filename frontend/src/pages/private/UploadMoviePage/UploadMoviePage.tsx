import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Film, Save, Upload, X } from 'lucide-react'
import { Button, Input, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { createCatalogContent, getAdminCatalogDetail, getUploadPosterUrl, getUploadTrailerUrl, updateCatalogContent } from '@/lib/catalogo-api'
import { formatVideoDuration, getVideoDuration } from '@/lib/media-duration'

interface MovieForm {
  titulo: string
  sinopsis: string
  genero: string
  director: string
  reparto: string
  subtitulos: string
  notasTecnicas: string
  fechaLanzamiento: string
  horaLanzamiento: string
  duracionMinutos: string
  idioma: string
  clasificacionEdad: string
  urlPortada: string
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'done'; objectName: string }
  | { phase: 'error'; message: string }

type FeedbackState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

const INITIAL_FORM: MovieForm = {
  titulo: '',
  sinopsis: '',
  genero: '',
  director: '',
  reparto: '',
  subtitulos: '',
  notasTecnicas: '',
  fechaLanzamiento: '',
  horaLanzamiento: '',
  duracionMinutos: '',
  idioma: 'es',
  clasificacionEdad: 'PG-13',
  urlPortada: '',
}

const AGE_OPTIONS = ['TP', 'G', 'PG', 'PG-13', 'R', 'NC-17']

function parseTechnicalSheet(sheet: string) {
  const metadata = new Map<string, string>()
  for (const rawPart of sheet.split(/\n|\|/)) {
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

function buildTechnicalSheet(form: MovieForm): string {
  const sections = [
    form.genero.trim() ? `Genero: ${form.genero.trim()}` : '',
    form.director.trim() ? `Director: ${form.director.trim()}` : '',
    form.reparto.trim() ? `Reparto: ${form.reparto.trim()}` : '',
    form.subtitulos.trim() ? `Subtitulos: ${form.subtitulos.trim()}` : '',
    form.notasTecnicas.trim() ? `Notas: ${form.notasTecnicas.trim()}` : '',
  ].filter(Boolean)

  return sections.join(' | ')
}

function normalizePosterObjectName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('posters/')) return trimmed

  try {
    const parsed = new URL(trimmed)
    const objectPath = parsed.pathname.split('/').filter(Boolean).slice(1).join('/')
    return objectPath.startsWith('posters/') ? objectPath : trimmed
  } catch {
    return trimmed
  }
}

export function UploadMoviePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const session = getActiveSession()
  const editingId = searchParams.get('edit')?.trim() ?? ''
  const [form, setForm] = useState<MovieForm>(INITIAL_FORM)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [loading, setLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(editingId))
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterUploadState, setPosterUploadState] = useState<UploadState>({ phase: 'idle' })
  const [trailerFile, setTrailerFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' })
  const [durationLabel, setDurationLabel] = useState('')
  const [savedContentId, setSavedContentId] = useState(editingId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const posterInputRef = useRef<HTMLInputElement>(null)
  const isUploading = uploadState.phase === 'uploading' || posterUploadState.phase === 'uploading'

  const setField = (field: keyof MovieForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setFeedback(null)
    setPosterFile(null)
    setPosterUploadState({ phase: 'idle' })
    setTrailerFile(null)
    setUploadState({ phase: 'idle' })
    setDurationLabel('')
  }

  const handlePosterSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPosterUploadState({ phase: 'error', message: 'Solo se aceptan imagenes jpg, png o webp.' })
      return
    }
    setPosterFile(file)
    setPosterUploadState({ phase: 'idle' })
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setUploadState({ phase: 'error', message: 'Solo se aceptan archivos de video (mp4, webm, etc.).' })
      return
    }
    setTrailerFile(file)
    setUploadState({ phase: 'idle' })
    void getVideoDuration(file)
      .then((duration) => {
        setDurationLabel(duration.label)
        setForm((prev) => ({ ...prev, duracionMinutos: String(duration.minutesForStorage) }))
      })
      .catch((error) => {
        setDurationLabel('')
        setForm((prev) => ({ ...prev, duracionMinutos: '' }))
        setUploadState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'No se pudo calcular la duracion del video.',
        })
      })
  }

  const uploadTrailerToGCS = async (token: string, contentId: string, file: File): Promise<string> => {
    setUploadState({ phase: 'uploading', progress: 0 })
    try {
      const { upload_url, object_name } = await getUploadTrailerUrl(token, contentId)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', 'video/mp4')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadState({ phase: 'uploading', progress: Math.round((event.loaded / event.total) * 100) })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Error al subir el archivo: HTTP ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el trailer.'))
        xhr.send(file)
      })

      setUploadState({ phase: 'done', objectName: object_name })
      return object_name
    } catch (error) {
      setUploadState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'No se pudo subir el trailer.',
      })
      throw error
    }
  }

  const uploadPosterToGCS = async (token: string, contentId: string, file: File): Promise<string> => {
    setPosterUploadState({ phase: 'uploading', progress: 0 })
    try {
      const { upload_url, object_name, content_type } = await getUploadPosterUrl(token, contentId, file)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', content_type)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setPosterUploadState({ phase: 'uploading', progress: Math.round((event.loaded / event.total) * 100) })
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Error al subir la portada: HTTP ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir la portada.'))
        xhr.send(file)
      })

      setPosterUploadState({ phase: 'done', objectName: object_name })
      setForm((prev) => ({ ...prev, urlPortada: object_name }))
      return object_name
    } catch (error) {
      setPosterUploadState({
        phase: 'error',
        message: error instanceof Error ? error.message : 'No se pudo subir la portada.',
      })
      throw error
    }
  }

  const handleManualUpload = async () => {
    if (!trailerFile) return
    const token = session?.accessToken
    if (!token) {
      setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa.' })
      return
    }
    const targetId = savedContentId || editingId
    if (!targetId) {
      setFeedback({ type: 'error', message: 'Primero guarda la pelicula para habilitar la subida del trailer.' })
      return
    }
    try {
      await uploadTrailerToGCS(token, targetId, trailerFile)
    } catch {
      // Error already set in uploadTrailerToGCS
    }
  }

  const handleManualPosterUpload = async () => {
    if (!posterFile) return
    const token = session?.accessToken
    if (!token) {
      setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa.' })
      return
    }
    const targetId = savedContentId || editingId
    if (!targetId) {
      setFeedback({ type: 'error', message: 'Primero guarda la pelicula para habilitar la subida de portada.' })
      return
    }
    try {
      await uploadPosterToGCS(token, targetId, posterFile)
    } catch {
      // Error already set in uploadPosterToGCS
    }
  }

  useEffect(() => {
    async function loadContentToEdit() {
      if (!editingId) return

      try {
        if (!session?.accessToken) {
          setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa. Inicia sesion nuevamente.' })
          return
        }
        const detail = await getAdminCatalogDetail(session.accessToken, editingId)
        const technicalSheet = parseTechnicalSheet(detail.ficha_tecnica ?? '')
        const posterObjectName = normalizePosterObjectName(detail.url_portada)
        
        // Extraer fecha y hora directamente sin conversión de zona horaria
        let fechaLanzamiento = ''
        let horaLanzamiento = ''
        if (detail.fecha_lanzamiento) {
          const parts = detail.fecha_lanzamiento.split('T')
          if (parts.length === 2) {
            fechaLanzamiento = parts[0]
            const timeParts = parts[1].split(':')
            if (timeParts.length >= 2) {
              horaLanzamiento = `${timeParts[0]}:${timeParts[1]}`
            }
          }
        }
        
        setForm({
          titulo: detail.titulo,
          sinopsis: detail.sinopsis,
          genero: technicalSheet.get('genero') ?? '',
          director: technicalSheet.get('director') ?? '',
          reparto: technicalSheet.get('reparto') ?? '',
          subtitulos: technicalSheet.get('subtitulos') ?? '',
          notasTecnicas: technicalSheet.get('notas') ?? detail.ficha_tecnica ?? '',
          fechaLanzamiento: fechaLanzamiento,
          horaLanzamiento: horaLanzamiento,
          duracionMinutos: detail.duracion_minutos ? String(detail.duracion_minutos) : '',
          idioma: detail.idioma,
          clasificacionEdad: detail.clasificacion_edad || 'PG-13',
          urlPortada: posterObjectName,
        })
        if (detail.duracion_minutos) {
          setDurationLabel(formatVideoDuration(detail.duracion_minutos * 60))
        }
        if (detail.url_trailer) {
          setUploadState({ phase: 'done', objectName: detail.url_trailer })
        }
        if (posterObjectName.startsWith('posters/')) {
          setPosterUploadState({ phase: 'done', objectName: posterObjectName })
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error instanceof Error ? error.message : 'No se pudo cargar la pelicula a editar.',
        })
      } finally {
        setIsBootstrapping(false)
      }
    }

    void loadContentToEdit()
  }, [editingId, session?.accessToken])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!session?.accessToken) {
      setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa. Inicia sesion nuevamente.' })
      return
    }

    if (!form.titulo.trim() || !form.sinopsis.trim() || (!form.urlPortada.trim() && !posterFile) || !form.duracionMinutos.trim()) {
      setFeedback({ type: 'error', message: 'Completa los campos obligatorios antes de guardar.' })
      return
    }

    if (!form.fechaLanzamiento || !form.horaLanzamiento) {
      setFeedback({ type: 'error', message: 'Debes seleccionar la fecha y hora de publicación.' })
      return
    }

    const duration = Number(form.duracionMinutos)
    if (!Number.isFinite(duration) || duration <= 0) {
      setFeedback({ type: 'error', message: 'Selecciona un video valido para calcular la duracion automaticamente.' })
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      let trailerObjectName = uploadState.phase === 'done' ? uploadState.objectName : undefined
      let posterObjectName = posterUploadState.phase === 'done' ? posterUploadState.objectName : undefined

      // Usar la hora exacta que seleccionó el usuario sin conversión
      const timeOnly = form.horaLanzamiento.split(':').slice(0, 2).join(':')
      const fechaHoraFormateada = `${form.fechaLanzamiento}T${timeOnly}:00`

      const payload = {
        titulo: form.titulo.trim(),
        sinopsis: form.sinopsis.trim(),
        ficha_tecnica: buildTechnicalSheet(form),
        fecha_lanzamiento: fechaHoraFormateada,
        clasificacion_edad: form.clasificacionEdad || undefined,
        duracion_minutos: duration,
        idioma: form.idioma.trim(),
        url_portada: posterObjectName || form.urlPortada.trim() || 'posters/pendiente.jpg',
        url_trailer: trailerObjectName,
      }

      let targetId = editingId
      if (editingId) {
        await updateCatalogContent(session.accessToken, editingId, payload)
      } else {
        const created = await createCatalogContent(session.accessToken, {
          ...payload,
          tipo: 'pelicula',
        })
        targetId = created.id
        setSavedContentId(created.id)
      }

      if (posterFile && targetId) {
        posterObjectName = await uploadPosterToGCS(session.accessToken, targetId, posterFile)
      }

      if (trailerFile && targetId) {
        trailerObjectName = await uploadTrailerToGCS(session.accessToken, targetId, trailerFile)
      }

      if (targetId && (posterFile || trailerFile)) {
        await updateCatalogContent(session.accessToken, targetId, {
          ...payload,
          url_portada: posterObjectName || payload.url_portada,
          url_trailer: trailerObjectName,
        })
      }

      setFeedback({
        type: 'success',
        message: editingId
          ? 'Pelicula actualizada correctamente en el catalogo.'
          : 'Pelicula registrada correctamente en el catalogo.',
      })
      setTimeout(() => navigate('/admin/catalog'), 1500)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo registrar la pelicula.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (isBootstrapping) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-4xl items-center justify-center px-4 py-8 text-white sm:px-6 lg:px-8">
        Cargando pelicula...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <ScrollReveal variant="fade-up">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/15">
            <Film size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {editingId ? 'Edicion de pelicula' : 'Registro de pelicula'}
            </h2>
            <p className="text-xs text-[var(--color-denim-500)]">
              Alta administrativa de contenido para publicarlo en el catalogo.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <ScrollReveal variant="fade-up" delay={20}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="mb-4 border-b border-white/[0.06] pb-2 text-sm font-semibold text-[var(--color-denim-200)]">
              Informacion general
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Titulo *" value={form.titulo} onChange={setField('titulo')} required />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">
                  Fecha y hora de publicación *
                </label>
                <input
                  type="datetime-local"
                  value={form.fechaLanzamiento && form.horaLanzamiento ? 
                    `${form.fechaLanzamiento}T${form.horaLanzamiento}` : 
                    ''
                  }
                  onChange={(e) => {
                    const value = e.target.value
                    if (value) {
                      const [date, time] = value.split('T')
                      setForm(prev => ({
                        ...prev,
                        fechaLanzamiento: date,
                        horaLanzamiento: time || ''
                      }))
                    } else {
                      setForm(prev => ({
                        ...prev,
                        fechaLanzamiento: '',
                        horaLanzamiento: ''
                      }))
                    }
                  }}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  required
                />
                <p className="text-xs text-[var(--color-denim-500)]">
                  Selecciona la fecha y hora exacta de publicación
                </p>
              </div>
              
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Sinopsis *</label>
                <textarea
                  rows={4}
                  value={form.sinopsis}
                  onChange={setField('sinopsis')}
                  required
                  className="w-full resize-none rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Genero</label>
                <input
                  value={form.genero}
                  onChange={setField('genero')}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">
                  Duracion calculada
                </label>
                <div className="rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-[var(--color-denim-200)]">
                  {durationLabel || (form.duracionMinutos ? formatVideoDuration(Number(form.duracionMinutos) * 60) : 'Se calculara al elegir el video')}
                </div>
                {durationLabel ? (
                  <p className="text-xs text-[var(--color-denim-500)]">
                    Se guardara como {form.duracionMinutos} min porque el catalogo almacena minutos enteros.
                  </p>
                ) : null}
              </div>
              <Input label="Idioma principal *" value={form.idioma} onChange={setField('idioma')} required />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Clasificacion</label>
                <select
                  value={form.clasificacionEdad}
                  onChange={setField('clasificacionEdad')}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                >
                  {AGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={60}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="mb-4 border-b border-white/[0.06] pb-2 text-sm font-semibold text-[var(--color-denim-200)]">
              Informacion tecnica y recursos
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Director" value={form.director} onChange={setField('director')} />
              <Input label="Subtitulos" placeholder="ES, EN, FR" value={form.subtitulos} onChange={setField('subtitulos')} />
              <div className="md:col-span-2">
                <Input label="Reparto principal" value={form.reparto} onChange={setField('reparto')} />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Notas tecnicas adicionales</label>
                <textarea
                  rows={3}
                  value={form.notasTecnicas}
                  onChange={setField('notasTecnicas')}
                  className="w-full resize-none rounded-lg border border-white/[0.07] bg-[#0d1220] px-4 py-2.5 text-sm text-white placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Portada *</label>
                <div className="flex flex-col gap-2 rounded-lg border border-white/[0.07] bg-[#0d1220] p-3">
                  {posterUploadState.phase === 'done' ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={15} className="shrink-0 text-[var(--color-success)]" />
                      <span className="truncate text-[var(--color-denim-300)]">{posterUploadState.objectName}</span>
                      <button
                        type="button"
                        onClick={() => { setPosterUploadState({ phase: 'idle' }); setPosterFile(null); setForm((prev) => ({ ...prev, urlPortada: '' })) }}
                        className="ml-auto shrink-0 text-[var(--color-denim-500)] hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : posterUploadState.phase === 'uploading' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary)]" />
                        Subiendo portada... {posterUploadState.progress}%
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200"
                          style={{ width: `${posterUploadState.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {posterFile ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                          <Film size={14} className="shrink-0" />
                          <span className="truncate">{posterFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setPosterFile(null)}
                            className="ml-auto shrink-0 text-[var(--color-denim-500)] hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-denim-500)]">
                          Selecciona una imagen jpg, png o webp. Se guardara en posters/{'{contenido_id}'}.
                        </p>
                      )}
                      {posterUploadState.phase === 'error' && (
                        <p className="text-xs text-[var(--color-error)]">{posterUploadState.message}</p>
                      )}
                      <div className="flex gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.10] hover:text-white">
                          <Upload size={12} />
                          Elegir portada
                          <input
                            ref={posterInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            className="sr-only"
                            onChange={handlePosterSelect}
                          />
                        </label>
                        {posterFile && (savedContentId || editingId) && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { void handleManualPosterUpload() }}
                            disabled={isUploading}
                          >
                            <Upload size={12} />
                            Subir ahora
                          </Button>
                        )}
                      </div>
                      {posterFile && !savedContentId && !editingId && (
                        <p className="text-xs text-[var(--color-denim-400)]">
                          La portada se subira automaticamente al guardar la pelicula.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Trailer (video mp4)</label>
                <div className="flex flex-col gap-2 rounded-lg border border-white/[0.07] bg-[#0d1220] p-3">
                  {uploadState.phase === 'done' ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={15} className="shrink-0 text-[var(--color-success)]" />
                      <span className="truncate text-[var(--color-denim-300)]">{uploadState.objectName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadState({ phase: 'idle' })
                          setTrailerFile(null)
                          setDurationLabel('')
                          if (!editingId) {
                            setForm((prev) => ({ ...prev, duracionMinutos: '' }))
                          }
                        }}
                        className="ml-auto shrink-0 text-[var(--color-denim-500)] hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : uploadState.phase === 'uploading' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-primary)]" />
                        Subiendo al bucket... {uploadState.progress}%
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-200"
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {trailerFile ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--color-denim-300)]">
                          <Film size={14} className="shrink-0" />
                          <span className="truncate">{trailerFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTrailerFile(null)
                              setDurationLabel('')
                              if (!editingId) {
                                setForm((prev) => ({ ...prev, duracionMinutos: '' }))
                              }
                            }}
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
                      {uploadState.phase === 'error' && (
                        <p className="text-xs text-[var(--color-error)]">{uploadState.message}</p>
                      )}
                      <div className="flex gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.10] hover:text-white">
                          <Upload size={12} />
                          Elegir archivo
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/webm,video/*"
                            className="sr-only"
                            onChange={handleFileSelect}
                          />
                        </label>
                        {trailerFile && (savedContentId || editingId) && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { void handleManualUpload() }}
                            disabled={isUploading}
                          >
                            <Upload size={12} />
                            Subir ahora
                          </Button>
                        )}
                      </div>
                      {trailerFile && !savedContentId && !editingId && (
                        <p className="text-xs text-[var(--color-denim-400)]">
                          El trailer se subira automaticamente al guardar la pelicula.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/[0.08] bg-[#080c14]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-denim-400)]">
              {editingId ? 'Guarda los cambios de la pelicula.' : 'Guarda la pelicula cuando los campos esten completos.'}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="button" variant="ghost" onClick={resetForm} className="w-full sm:w-auto">
                Limpiar formulario
              </Button>
              <Button type="submit" disabled={loading || isUploading} className="w-full sm:w-auto">
                {loading || isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {isUploading ? 'Subiendo trailer...' : 'Guardando...'}
                  </span>
                ) : (
                  <>
                    <Save size={15} />
                    {editingId ? 'Guardar cambios' : 'Subir pelicula'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
