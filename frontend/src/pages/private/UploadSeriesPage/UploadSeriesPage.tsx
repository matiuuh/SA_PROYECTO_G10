import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Save, Tv2 } from 'lucide-react'
import { Button, Input, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { createCatalogContent } from '@/lib/catalogo-api'

interface SeriesForm {
  titulo: string
  sinopsis: string
  fechaLanzamiento: string
  idioma: string
  clasificacionEdad: string
  creador: string
  reparto: string
  subtitulos: string
  temporadas: string
  urlPortada: string
  urlTrailer: string
}

type FeedbackState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

const INITIAL_FORM: SeriesForm = {
  titulo: '',
  sinopsis: '',
  fechaLanzamiento: '',
  idioma: 'es',
  clasificacionEdad: 'PG-13',
  creador: '',
  reparto: '',
  subtitulos: '',
  temporadas: '1',
  urlPortada: '',
  urlTrailer: '',
}

const AGE_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17']

function buildTechnicalSheet(form: SeriesForm): string {
  const sections = [
    `Creador: ${form.creador || 'No especificado'}`,
    `Reparto: ${form.reparto || 'No especificado'}`,
    `Subtitulos: ${form.subtitulos || 'No especificado'}`,
    `Temporadas planificadas: ${form.temporadas || '1'}`,
  ]

  return sections.join(' | ')
}

export function UploadSeriesPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [form, setForm] = useState<SeriesForm>(INITIAL_FORM)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [loading, setLoading] = useState(false)

  const setField = (field: keyof SeriesForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setFeedback(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!session?.accessToken) {
      setFeedback({ type: 'error', message: 'Tu sesion ya no esta activa. Inicia sesion nuevamente.' })
      return
    }

    if (!form.titulo.trim() || !form.sinopsis.trim() || !form.urlPortada.trim()) {
      setFeedback({ type: 'error', message: 'Completa los campos obligatorios antes de guardar.' })
      return
    }

    const seasons = Number(form.temporadas)
    if (!Number.isFinite(seasons) || seasons <= 0) {
      setFeedback({ type: 'error', message: 'La serie debe indicar al menos una temporada.' })
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      await createCatalogContent(session.accessToken, {
        titulo: form.titulo.trim(),
        tipo: 'serie',
        sinopsis: form.sinopsis.trim(),
        ficha_tecnica: buildTechnicalSheet(form),
        fecha_lanzamiento: form.fechaLanzamiento || undefined,
        clasificacion_edad: form.clasificacionEdad || undefined,
        idioma: form.idioma.trim(),
        url_portada: form.urlPortada.trim(),
        url_trailer: form.urlTrailer.trim() || undefined,
      })

      setFeedback({ type: 'success', message: 'Serie registrada correctamente en el catalogo.' })
      setTimeout(() => navigate('/admin/catalog'), 1200)
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo registrar la serie.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <ScrollReveal variant="fade-up">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/15">
            <Tv2 size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Registro de serie</h2>
            <p className="text-xs text-[var(--color-denim-500)]">
              Alta administrativa de la ficha general de una serie para el catalogo.
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
          <section className="sticky top-3 z-10 rounded-xl border border-[var(--color-primary)]/20 bg-[#0a0f1c]/95 p-4 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Accion principal</p>
                <p className="text-xs text-[var(--color-denim-400)]">
                  Cuando termines de llenar los datos, usa este boton para subir la serie al catalogo.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Limpiar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Subiendo...
                    </span>
                  ) : (
                    <>
                      <Save size={15} />
                      Subir serie
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={40}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="mb-4 border-b border-white/[0.06] pb-2 text-sm font-semibold text-[var(--color-denim-200)]">
              Informacion general
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Titulo *" value={form.titulo} onChange={setField('titulo')} required />
              <Input label="Fecha de lanzamiento" type="date" value={form.fechaLanzamiento} onChange={setField('fechaLanzamiento')} />
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
              <Input label="Idioma principal *" value={form.idioma} onChange={setField('idioma')} required />
              <Input
                label="Temporadas previstas *"
                type="number"
                min="1"
                value={form.temporadas}
                onChange={setField('temporadas')}
                required
              />
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

        <ScrollReveal variant="fade-up" delay={80}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="mb-4 border-b border-white/[0.06] pb-2 text-sm font-semibold text-[var(--color-denim-200)]">
              Informacion tecnica
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Creador o director" value={form.creador} onChange={setField('creador')} />
              <Input label="Subtitulos" placeholder="ES, EN, FR" value={form.subtitulos} onChange={setField('subtitulos')} />
              <div className="md:col-span-2">
                <Input label="Reparto principal" value={form.reparto} onChange={setField('reparto')} />
              </div>
              <Input
                label="URL de portada *"
                type="url"
                placeholder="https://..."
                value={form.urlPortada}
                onChange={setField('urlPortada')}
                required
              />
              <Input
                label="URL de trailer"
                type="url"
                placeholder="https://..."
                value={form.urlTrailer}
                onChange={setField('urlTrailer')}
              />
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={110}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <p className="text-sm font-semibold text-white">Alcance actual del registro</p>
            <p className="mt-2 text-sm text-[var(--color-denim-400)]">
              Este formulario registra la ficha general y tecnica de la serie en el catalogo. La carga estructurada
              de temporadas y episodios la dejamos para el siguiente flujo administrativo.
            </p>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={140}>
          <div className="flex items-center justify-end gap-3 pb-4">
            <Button type="button" variant="ghost" onClick={resetForm}>
              Limpiar formulario
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Subiendo...
                </span>
              ) : (
                <>
                  <Save size={15} />
                  Subir serie
                </>
              )}
            </Button>
          </div>
        </ScrollReveal>
      </form>
    </div>
  )
}
