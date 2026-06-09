import { Eye, Film, List, Pencil, Trash2, Tv2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ScrollReveal } from '@/components/atoms'
import { MediaCard } from '@/components/molecules'
import { deleteCatalogContent, getCatalogDetail, listCatalogContent } from '@/lib/catalogo-api'
import { getActiveSession } from '@/lib/auth'
import type { CatalogContent } from '@/types/catalog'

type AdminCatalogFilter = 'all' | 'pelicula' | 'serie'
type AdminGenreFilter = 'all' | string

function parseTechnicalSheetGenres(sheet?: string): string[] {
  const source = sheet?.trim() ?? ''
  if (!source) return []

  for (const rawPart of source.split(/\n|\|/)) {
    const part = rawPart.trim()
    if (!part) continue

    const separatorIndex = part.indexOf(':')
    if (separatorIndex <= 0) continue

    const key = part.slice(0, separatorIndex).trim().toLowerCase()
    if (key !== 'genero' && key !== 'género' && key !== 'generos' && key !== 'géneros') {
      continue
    }

    const value = part.slice(separatorIndex + 1).trim()
    if (!value) return []

    return value
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
  }

  return []
}

const CATALOG_SECTIONS = [
  {
    title: 'Publicacion de peliculas',
    description:
      'Desde aqui puedes continuar al formulario de carga para registrar una pelicula nueva en el catalogo.',
    icon: <Film size={18} strokeWidth={1.75} />,
    actionLabel: 'Subir pelicula',
    actionTo: '/admin/upload/movie',
  },
  {
    title: 'Publicacion de series',
    description:
      'Desde aqui puedes continuar al formulario de carga para registrar la ficha general de una serie.',
    icon: <Tv2 size={18} strokeWidth={1.75} />,
    actionLabel: 'Subir serie',
    actionTo: '/admin/upload/series',
  },
]

export function AdminCatalogPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [busyContentId, setBusyContentId] = useState('')
  const [catalogFilter, setCatalogFilter] = useState<AdminCatalogFilter>('all')
  const [genreFilter, setGenreFilter] = useState<AdminGenreFilter>('all')
  const [genreMap, setGenreMap] = useState<Record<string, string[]>>({})

  useEffect(() => {
    async function loadCatalog() {
      try {
        const contents = await listCatalogContent()
        setCatalog(contents)

        const details = await Promise.all(
          contents.map(async (content) => {
            try {
              const detail = await getCatalogDetail(content.id)
              const genresFromRelations = detail.generos.map((genre) => genre.nombre.trim()).filter(Boolean)
              const genresFromSheet = parseTechnicalSheetGenres(detail.ficha_tecnica)
              return {
                id: content.id,
                genres: Array.from(new Set([...genresFromRelations, ...genresFromSheet])),
              }
            } catch {
              return {
                id: content.id,
                genres: [] as string[],
              }
            }
          }),
        )

        const nextGenreMap = details.reduce<Record<string, string[]>>((acc, item) => {
          acc[item.id] = item.genres
          return acc
        }, {})

        setGenreMap(nextGenreMap)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo mostrar el catalogo.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadCatalog()
  }, [])

  async function refreshCatalog() {
    try {
      const contents = await listCatalogContent()
      setCatalog(contents)

      const details = await Promise.all(
        contents.map(async (content) => {
          try {
            const detail = await getCatalogDetail(content.id)
            const genresFromRelations = detail.generos.map((genre) => genre.nombre.trim()).filter(Boolean)
            const genresFromSheet = parseTechnicalSheetGenres(detail.ficha_tecnica)
            return {
              id: content.id,
              genres: Array.from(new Set([...genresFromRelations, ...genresFromSheet])),
            }
          } catch {
            return {
              id: content.id,
              genres: [] as string[],
            }
          }
        }),
      )

      const nextGenreMap = details.reduce<Record<string, string[]>>((acc, item) => {
        acc[item.id] = item.genres
        return acc
      }, {})

      setGenreMap(nextGenreMap)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo mostrar el catalogo.')
    }
  }

  async function handleDelete(item: CatalogContent) {
    if (!session?.accessToken) {
      setErrorMessage('Tu sesion ya no esta activa. Inicia sesion nuevamente.')
      return
    }

    const confirmed = window.confirm(`¿Deseas eliminar "${item.titulo}" del catalogo?`)
    if (!confirmed) return

    setBusyContentId(item.id)
    try {
      await deleteCatalogContent(session.accessToken, item.id)
      await refreshCatalog()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el contenido.')
    } finally {
      setBusyContentId('')
    }
  }

  const stats = useMemo(() => {
    const movies = catalog.filter((item) => item.tipo === 'pelicula').length
    const series = catalog.filter((item) => item.tipo === 'serie').length
    return {
      total: catalog.length,
      movies,
      series,
    }
  }, [catalog])

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesCategory = catalogFilter === 'all' ? true : item.tipo === catalogFilter
      const genres = genreMap[item.id] ?? []
      const matchesGenre =
        genreFilter === 'all'
          ? true
          : genres.some((genre) => genre.toLowerCase() === genreFilter.toLowerCase())

      return matchesCategory && matchesGenre
    })
  }, [catalog, catalogFilter, genreFilter, genreMap])

  const availableGenres = useMemo(
    () =>
      Array.from(new Set(Object.values(genreMap).flat()))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'es')),
    [genreMap],
  )

  useEffect(() => {
    if (genreFilter === 'all') return
    if (!availableGenres.includes(genreFilter)) {
      setGenreFilter('all')
    }
  }, [availableGenres, genreFilter])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      <ScrollReveal variant="fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 flex items-center justify-center">
            <List size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Catalogo administrativo</h2>
            <p className="text-sm text-[var(--color-denim-400)] mt-0.5">
              Organiza el flujo de carga y validacion del contenido disponible en Quetzal TV.
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Contenido total</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Peliculas</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.movies}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Series</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.series}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300 mb-8">
          {errorMessage}
        </div>
      )}

      <ScrollReveal variant="fade-up" delay={120}>
        <section className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white">Cartelera vigente</h3>
              <p className="text-sm text-[var(--color-denim-400)] mt-1">
                Consulta el contenido disponible y navega entre peliculas y series publicadas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {CATALOG_SECTIONS.map((section) => (
                <Button key={section.title} onClick={() => navigate(section.actionTo)}>
                  <Upload size={15} />
                  {section.actionLabel}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'all', label: 'Todo' },
                { id: 'pelicula', label: 'Peliculas' },
                { id: 'serie', label: 'Series' },
              ].map((filterOption) => {
                const isActive = catalogFilter === filterOption.id
                return (
                  <button
                    key={filterOption.id}
                    onClick={() => setCatalogFilter(filterOption.id as AdminCatalogFilter)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-[var(--color-denim-300)] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {filterOption.label}
                  </button>
                )
              })}
            </div>

            <label className="flex w-full max-w-xs flex-col gap-2 text-sm text-[var(--color-denim-300)]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">
                Genero
              </span>
              <select
                value={genreFilter}
                onChange={(event) => setGenreFilter(event.target.value)}
                className="h-11 rounded-xl border border-white/[0.08] bg-[#0d1220] px-4 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
              >
                <option value="all">Todos los generos</option>
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-white">
              Cargando catalogo...
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <p className="text-lg font-semibold text-white">No hay contenido para este filtro.</p>
              <p className="max-w-lg text-sm text-[var(--color-denim-400)]">
                Cambia el filtro o registra nuevo contenido para completar esta vista.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCatalog.map((item) => (
                <div key={item.id} className="space-y-3">
                  <MediaCard
                    title={item.titulo}
                    genre={(genreMap[item.id] ?? [])[0] || (item.tipo === 'serie' ? 'Serie' : 'Pelicula')}
                    year={item.fecha_lanzamiento ? Number(item.fecha_lanzamiento.slice(0, 4)) : new Date().getFullYear()}
                    rating={
                      item.porcentaje_recomendacion > 0
                        ? Math.max(0, Math.min(10, item.porcentaje_recomendacion / 10))
                        : null
                    }
                    posterUrl={item.url_portada}
                    isNew={item.fecha_lanzamiento ? Number(item.fecha_lanzamiento.slice(0, 4)) >= new Date().getFullYear() - 1 : false}
                    onClick={() => navigate(`/movie/${item.id}`)}
                  />
                  <div className={`grid gap-2 ${item.tipo === 'serie' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    <Button variant="ghost" onClick={() => navigate(`/movie/${item.id}`)}>
                      <Eye size={14} />
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        navigate(
                          item.tipo === 'serie'
                            ? `/admin/upload/series?edit=${item.id}`
                            : `/admin/upload/movie?edit=${item.id}`,
                        )
                      }
                    >
                      <Pencil size={14} />
                      Editar
                    </Button>
                    {item.tipo === 'serie' ? (
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/admin/series/${item.id}/episodes`)}
                      >
                        <List size={14} />
                        Capitulos
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        void handleDelete(item)
                      }}
                      disabled={busyContentId === item.id}
                      className="text-red-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200"
                    >
                      <Trash2 size={14} />
                      {busyContentId === item.id ? '...' : 'Borrar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>
    </div>
  )
}
