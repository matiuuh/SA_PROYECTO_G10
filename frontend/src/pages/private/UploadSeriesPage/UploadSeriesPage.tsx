import { useState, useRef } from 'react'
import {
  Tv2,
  Upload,
  ImagePlus,
  X,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronDown,
} from 'lucide-react'
import { Input, Button, ScrollReveal } from '@/components/atoms'

interface Episode {
  id: string
  title: string
  duration: string
  synopsis: string
  file: File | null
}

interface SeriesForm {
  title: string
  originalTitle: string
  synopsis: string
  genre: string
  year: string
  totalSeasons: string
  language: string
  subtitles: string
  ageRating: string
  director: string
  cast: string
  status: string
}

const INITIAL_FORM: SeriesForm = {
  title: '', originalTitle: '', synopsis: '', genre: '', year: '',
  totalSeasons: '1', language: '', subtitles: '', ageRating: '',
  director: '', cast: '', status: 'draft',
}

const INITIAL_EPISODE = (): Episode => ({
  id: crypto.randomUUID(),
  title: '',
  duration: '',
  synopsis: '',
  file: null,
})

const GENRE_OPTIONS = [
  'Acción', 'Aventura', 'Animación', 'Ciencia ficción', 'Comedia',
  'Drama', 'Fantasía', 'Horror', 'Misterio', 'Romance', 'Thriller',
]

const AGE_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17']

type FeedbackType = 'success' | 'error' | null

export function UploadSeriesPage() {
  const [form, setForm] = useState<SeriesForm>(INITIAL_FORM)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([INITIAL_EPISODE()])
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [loading, setLoading] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const episodeVideoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const set = (field: keyof SeriesForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const addEpisode = () => setEpisodes((prev) => [...prev, INITIAL_EPISODE()])

  const removeEpisode = (id: string) =>
    setEpisodes((prev) => prev.filter((ep) => ep.id !== id))

  const updateEpisode = (id: string, field: keyof Omit<Episode, 'id' | 'file'>, value: string) =>
    setEpisodes((prev) =>
      prev.map((ep) => (ep.id === id ? { ...ep, [field]: value } : ep))
    )

  const handleEpisodeVideo = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setEpisodes((prev) =>
      prev.map((ep) => (ep.id === id ? { ...ep, file } : ep))
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.genre || !form.year) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setFeedback('success')
      setTimeout(() => setFeedback(null), 4000)
    }, 1500)
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setCoverPreview(null)
    setCoverFile(null)
    setEpisodes([INITIAL_EPISODE()])
    setFeedback(null)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">

      <ScrollReveal variant="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 flex items-center justify-center">
            <Tv2 size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Subir serie</h2>
            <p className="text-xs text-[var(--color-denim-500)]">Completa todos los campos para publicar</p>
          </div>
        </div>
      </ScrollReveal>

      {feedback && (
        <ScrollReveal variant="fade-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm font-medium ${
            feedback === 'success'
              ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
              : 'bg-[var(--color-error)]/10 border-[var(--color-error)]/30 text-[var(--color-error)]'
          }`}>
            <CheckCircle2 size={16} />
            {feedback === 'success'
              ? '¡Serie subida correctamente! Estará disponible tras revisión.'
              : 'Ocurrió un error al subir la serie. Intenta de nuevo.'
            }
          </div>
        </ScrollReveal>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        <ScrollReveal variant="fade-up" delay={40}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Información básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Título *" placeholder="Título en español" value={form.title} onChange={set('title')} required />
              <Input label="Título original" placeholder="Original title" value={form.originalTitle} onChange={set('originalTitle')} />

              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Sinopsis *</label>
                <textarea
                  rows={4}
                  placeholder="Descripción de la serie..."
                  value={form.synopsis}
                  onChange={set('synopsis')}
                  required
                  className="w-full px-4 py-2.5 bg-[#0d1220] border border-white/[0.07] rounded-lg text-white placeholder:text-[var(--color-denim-500)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Género *</label>
                <div className="relative">
                  <select
                    value={form.genre}
                    onChange={set('genre')}
                    required
                    className="w-full px-4 py-2.5 pr-10 bg-[#0d1220] border border-white/[0.07] rounded-lg text-white appearance-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar género</option>
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-[#0d1220]">{g}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-denim-500)] pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-denim-200)]">Clasificación de edad</label>
                <div className="relative">
                  <select
                    value={form.ageRating}
                    onChange={set('ageRating')}
                    className="w-full px-4 py-2.5 pr-10 bg-[#0d1220] border border-white/[0.07] rounded-lg text-white appearance-none focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar clasificación</option>
                    {AGE_OPTIONS.map((a) => (
                      <option key={a} value={a} className="bg-[#0d1220]">{a}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-denim-500)] pointer-events-none" />
                </div>
              </div>

              <Input label="Año de estreno *" type="number" min="1900" max="2099" placeholder="2024" value={form.year} onChange={set('year')} required />
              <Input label="Número de temporadas" type="number" min="1" placeholder="1" value={form.totalSeasons} onChange={set('totalSeasons')} />
              <Input label="Idioma" placeholder="Español" value={form.language} onChange={set('language')} />
              <Input label="Subtítulos disponibles" placeholder="ES, EN, FR" value={form.subtitles} onChange={set('subtitles')} />
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={80}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Equipo y reparto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Creador / Director" placeholder="Nombre del creador" value={form.director} onChange={set('director')} />
              <div className="md:col-span-2">
                <Input label="Reparto principal" placeholder="Actor 1, Actor 2, Actriz 1..." value={form.cast} onChange={set('cast')} />
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={110}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Imagen de portada
            </h3>
            <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
            {coverPreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-white/[0.07] aspect-[2/3] w-40">
                <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverPreview(null); setCoverFile(null) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="w-40 aspect-[2/3] rounded-xl border-2 border-dashed border-white/[0.12] hover:border-[var(--color-denim-500)] bg-[#080c14] hover:bg-[var(--color-denim-900)]/20 flex flex-col items-center justify-center gap-2 transition-all duration-200 text-[var(--color-denim-500)] hover:text-[var(--color-denim-300)]"
              >
                <ImagePlus size={24} strokeWidth={1.25} />
                <span className="text-xs">Subir portada</span>
              </button>
            )}
            {coverFile && (
              <p className="text-[11px] text-[var(--color-denim-500)] mt-1.5 truncate max-w-[160px]">{coverFile.name}</p>
            )}
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={140}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-[var(--color-denim-200)]">
                Episodios
                <span className="ml-2 text-xs font-normal text-[var(--color-denim-500)]">({episodes.length})</span>
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addEpisode}>
                <Plus size={13} />
                Añadir episodio
              </Button>
            </div>

            <div className="space-y-4">
              {episodes.map((ep, idx) => {
                const videoInputRef = (el: HTMLInputElement | null) => {
                  episodeVideoRefs.current[ep.id] = el
                }
                return (
                  <div key={ep.id} className="rounded-lg border border-white/[0.06] bg-[#080c14] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-[var(--color-denim-400)] uppercase tracking-wider">
                        Episodio {idx + 1}
                      </span>
                      {episodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEpisode(ep.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-denim-600)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <Input
                          label="Título del episodio"
                          placeholder={`Episodio ${idx + 1}`}
                          value={ep.title}
                          onChange={(e) => updateEpisode(ep.id, 'title', e.target.value)}
                        />
                      </div>
                      <Input
                        label="Duración (min)"
                        type="number"
                        min="1"
                        placeholder="45"
                        value={ep.duration}
                        onChange={(e) => updateEpisode(ep.id, 'duration', e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 mb-3">
                      <label className="text-sm font-medium text-[var(--color-denim-200)]">Sinopsis del episodio</label>
                      <textarea
                        rows={2}
                        placeholder="Descripción breve..."
                        value={ep.synopsis}
                        onChange={(e) => updateEpisode(ep.id, 'synopsis', e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#0d1220] border border-white/[0.07] rounded-lg text-white placeholder:text-[var(--color-denim-500)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none text-sm"
                      />
                    </div>

                    <div>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleEpisodeVideo(ep.id, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => episodeVideoRefs.current[ep.id]?.click()}
                        className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-all duration-200 ${
                          ep.file
                            ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)]'
                            : 'border-white/[0.08] hover:border-[var(--color-denim-500)] text-[var(--color-denim-500)] hover:text-[var(--color-denim-300)]'
                        }`}
                      >
                        {ep.file ? (
                          <>
                            <CheckCircle2 size={15} strokeWidth={1.75} />
                            <span className="truncate max-w-xs">{ep.file.name}</span>
                          </>
                        ) : (
                          <>
                            <Upload size={15} strokeWidth={1.75} />
                            Subir archivo de video
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={180}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Estado de publicación
            </h3>
            <div className="flex flex-wrap gap-3">
              {(['draft', 'review', 'published'] as const).map((s) => {
                const labels = { draft: 'Borrador', review: 'En revisión', published: 'Publicado' }
                return (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={form.status === s}
                      onChange={set('status')}
                      className="sr-only"
                    />
                    <div className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
                      form.status === s
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                        : 'border-white/[0.08] text-[var(--color-denim-400)] hover:border-white/20'
                    }`}>
                      {labels[s]}
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={220}>
          <div className="flex items-center justify-end gap-3 pb-4">
            <Button type="button" variant="ghost" onClick={handleReset}>
              Limpiar formulario
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Subiendo...
                </span>
              ) : (
                <>
                  <Upload size={15} />
                  Publicar serie
                </>
              )}
            </Button>
          </div>
        </ScrollReveal>

      </form>
    </div>
  )
}
