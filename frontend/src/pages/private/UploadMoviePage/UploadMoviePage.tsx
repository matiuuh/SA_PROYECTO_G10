import { useState, useRef } from 'react'
import {
  Film,
  Upload,
  ImagePlus,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { Input, Button, ScrollReveal } from '@/components/atoms'

interface MovieForm {
  title: string
  originalTitle: string
  synopsis: string
  genre: string
  year: string
  duration: string
  rating: string
  director: string
  cast: string
  language: string
  subtitles: string
  ageRating: string
  status: string
}

const INITIAL: MovieForm = {
  title: '', originalTitle: '', synopsis: '', genre: '', year: '',
  duration: '', rating: '', director: '', cast: '', language: '',
  subtitles: '', ageRating: '', status: 'draft',
}

const GENRE_OPTIONS = [
  'Acción', 'Aventura', 'Animación', 'Ciencia ficción', 'Comedia',
  'Drama', 'Fantasía', 'Horror', 'Misterio', 'Romance', 'Thriller',
]

const AGE_OPTIONS = ['G', 'PG', 'PG-13', 'R', 'NC-17']

type FeedbackType = 'success' | 'error' | null

export function UploadMoviePage() {
  const [form, setForm] = useState<MovieForm>(INITIAL)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [loading, setLoading] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof MovieForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setVideoFile(file)
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
    setForm(INITIAL)
    setCoverPreview(null)
    setCoverFile(null)
    setVideoFile(null)
    setFeedback(null)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">

      <ScrollReveal variant="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 flex items-center justify-center">
            <Film size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Subir película</h2>
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
            {feedback === 'success'
              ? <CheckCircle2 size={16} />
              : <AlertCircle size={16} />
            }
            {feedback === 'success'
              ? '¡Película subida correctamente! Estará disponible tras revisión.'
              : 'Ocurrió un error al subir la película. Intenta de nuevo.'
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
                  placeholder="Descripción de la película..."
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
              <Input label="Duración (min)" type="number" min="1" placeholder="120" value={form.duration} onChange={set('duration')} />
              <Input label="Puntuación (0-10)" type="number" min="0" max="10" step="0.1" placeholder="7.5" value={form.rating} onChange={set('rating')} />
              <Input label="Idioma" placeholder="Español" value={form.language} onChange={set('language')} />
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={80}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Equipo y reparto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Director" placeholder="Nombre del director" value={form.director} onChange={set('director')} />
              <Input label="Subtítulos disponibles" placeholder="ES, EN, FR" value={form.subtitles} onChange={set('subtitles')} />
              <div className="md:col-span-2">
                <Input label="Reparto principal" placeholder="Actor 1, Actor 2, Actriz 1..." value={form.cast} onChange={set('cast')} />
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={120}>
          <section className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-denim-200)] mb-4 pb-2 border-b border-white/[0.06]">
              Archivos multimedia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm font-medium text-[var(--color-denim-200)] mb-2">Imagen de portada</p>
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
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--color-denim-200)] mb-2">Archivo de video</p>
                <input ref={videoRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  className={`w-full rounded-xl border-2 border-dashed py-8 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
                    videoFile
                      ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5 text-[var(--color-success)]'
                      : 'border-white/[0.12] hover:border-[var(--color-denim-500)] bg-[#080c14] hover:bg-[var(--color-denim-900)]/20 text-[var(--color-denim-500)] hover:text-[var(--color-denim-300)]'
                  }`}
                >
                  {videoFile ? (
                    <>
                      <CheckCircle2 size={28} strokeWidth={1.25} />
                      <div className="text-center">
                        <p className="text-sm font-medium">Archivo seleccionado</p>
                        <p className="text-xs opacity-70 truncate max-w-[200px]">{videoFile.name}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={28} strokeWidth={1.25} />
                      <div className="text-center">
                        <p className="text-sm font-medium">Subir video</p>
                        <p className="text-xs opacity-60">MP4, MKV, AVI — hasta 20 GB</p>
                      </div>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={160}>
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

        <ScrollReveal variant="fade-up" delay={200}>
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
                  Publicar película
                </>
              )}
            </Button>
          </div>
        </ScrollReveal>

      </form>
    </div>
  )
}
