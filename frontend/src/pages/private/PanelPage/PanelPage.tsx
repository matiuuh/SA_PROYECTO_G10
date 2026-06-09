import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X, Lock } from 'lucide-react'
import { ContentRow, SearchBar, MediaCard } from '@/components/molecules'
import { Button, ScrollReveal } from '@/components/atoms'
import { DashboardHero } from '@/components/organisms'
import { getActiveSession, getStoredActiveProfile, syncStoredActiveProfile } from '@/lib/auth'
import { getCatalogDetail, listCatalogContent, searchCatalogContent } from '@/lib/catalogo-api'
import { getMyList } from '@/lib/my-list'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import { listProfiles } from '@/lib/usuario-api'
import type { CatalogContent } from '@/types/catalog'
import type { ContentItem } from '@/components/molecules'

type CatalogFilter = 'all' | 'pelicula' | 'serie'
type GenreFilter = 'all' | string

interface CatalogEntry {
  content: CatalogContent
  item: ContentItem
  genreNames: string[]
}

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

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function getTypeLabel(type: string): string {
  return type === 'serie' ? 'Serie' : 'Pelicula'
}

function mapCatalogToContentItem(content: CatalogContent): ContentItem {
  const hasRecommendation = content.porcentaje_recomendacion > 0
  return {
    id: content.id,
    title: content.titulo,
    genre: getTypeLabel(content.tipo),
    year: getReleaseYear(content.fecha_lanzamiento),
    rating: hasRecommendation ? Math.max(0, Math.min(10, content.porcentaje_recomendacion / 10)) : null,
    posterUrl: content.url_portada,
    isNew: getReleaseYear(content.fecha_lanzamiento) >= new Date().getFullYear() - 1,
  }
}

export function PanelPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const accountId = session?.account.id ?? ''
  const accessToken = session?.accessToken ?? ''
  const [query, setQuery] = useState('')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all')
  const [genreFilter, setGenreFilter] = useState<GenreFilter>('all')
  const [genreMap, setGenreMap] = useState<Record<string, string[]>>({})
  const [searchResults, setSearchResults] = useState<ContentItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!accountId || !accessToken) {
        setIsLoadingSubscription(false)
        return
      }

      try {
        const [status, profiles] = await Promise.all([
          getSubscriptionStatusByAccount(accessToken, accountId),
          listProfiles(accessToken),
        ])
        setHasSubscription(status.tiene_suscripcion)

        if (status.tiene_suscripcion) {
          const syncedProfile = syncStoredActiveProfile(profiles)
          if (!syncedProfile) {
            navigate('/profiles', { replace: true, state: { reason: activeProfile ? 'invalid-profile' : 'select-profile' } })
            return
          }
        }
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    void loadSubscriptionStatus()
  }, [accessToken, accountId, activeProfile, navigate])

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
        setCatalogError(error instanceof Error ? error.message : 'No se pudo mostrar el catalogo.')
      } finally {
        setIsLoadingCatalog(false)
      }
    }

    void loadCatalog()
  }, [])

  const catalogEntries = useMemo<CatalogEntry[]>(
    () =>
      catalog.map((content) => ({
        content,
        item: mapCatalogToContentItem(content),
        genreNames: genreMap[content.id] ?? [],
      })),
    [catalog, genreMap],
  )

  const availableGenres = useMemo(
    () =>
      Array.from(new Set(catalogEntries.flatMap((entry) => entry.genreNames)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, 'es')),
    [catalogEntries],
  )

  const filteredEntries = useMemo(() => {
    return catalogEntries.filter((entry) => {
      const matchesCategory =
        catalogFilter === 'all' ? true : entry.content.tipo === catalogFilter
      const matchesGenre =
        genreFilter === 'all'
          ? true
          : entry.genreNames.some((genre) => genre.toLowerCase() === genreFilter.toLowerCase())

      return matchesCategory && matchesGenre
    })
  }, [catalogEntries, catalogFilter, genreFilter])

  const filteredContent = useMemo(
    () => filteredEntries.map((entry) => entry.item),
    [filteredEntries],
  )

  const featured = useMemo(() => {
    const topContent = [...catalog].sort(
      (left, right) => right.porcentaje_recomendacion - left.porcentaje_recomendacion,
    )[0]

    return topContent
      ? {
          title: topContent.titulo,
          description: topContent.sinopsis || 'Disponible en Quetzal TV.',
          genre: getTypeLabel(topContent.tipo),
          year: getReleaseYear(topContent.fecha_lanzamiento),
          rating:
            topContent.porcentaje_recomendacion > 0
              ? Math.max(0, Math.min(10, topContent.porcentaje_recomendacion / 10))
              : null,
        }
      : {
          title: 'Catalogo Quetzal TV',
          description: 'Explora las peliculas y series disponibles en la plataforma.',
          genre: 'Streaming',
          year: new Date().getFullYear(),
          rating: null,
        }
  }, [catalog])

  const rows = useMemo(() => {
    const myListIds = activeProfile?.id ? getMyList(activeProfile.id) : []
    const myListItems = myListIds
      .map((contentId) => filteredContent.find((item) => item.id === contentId) ?? null)
      .filter((item): item is ContentItem => item != null)

    const recommended = filteredContent
      .filter((item) => item.rating != null && item.rating >= 7)
      .slice(0, 8)
    const movies = filteredContent
      .filter((item) => item.genre === 'Pelicula')
      .slice(0, 8)
    const series = filteredContent
      .filter((item) => item.genre === 'Serie')
      .slice(0, 8)
    const recent = [...filteredContent]
      .sort((left, right) => right.year - left.year)
      .slice(0, 8)

    if (catalogFilter === 'pelicula') {
      return [
        { id: 'my-list', title: 'Mi lista de peliculas', items: myListItems },
        { id: 'recommended', title: 'Peliculas recomendadas', items: recommended },
        { id: 'movies', title: 'Peliculas disponibles', items: movies },
        { id: 'recent', title: 'Peliculas recientes', items: recent },
      ].filter((row) => row.items.length > 0)
    }

    if (catalogFilter === 'serie') {
      return [
        { id: 'my-list', title: 'Mi lista de series', items: myListItems },
        { id: 'recommended', title: 'Series recomendadas', items: recommended },
        { id: 'series', title: 'Series disponibles', items: series },
        { id: 'recent', title: 'Series recientes', items: recent },
      ].filter((row) => row.items.length > 0)
    }

    return [
      { id: 'my-list', title: 'Mi lista', items: myListItems },
      { id: 'recommended', title: 'Recomendacion global', items: recommended },
      { id: 'movies', title: 'Peliculas disponibles', items: movies },
      { id: 'series', title: 'Series disponibles', items: series },
      { id: 'recent', title: 'Estrenos y recientes', items: recent },
    ].filter((row) => row.items.length > 0)
  }, [activeProfile?.id, catalogFilter, filteredContent])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      void searchCatalogContent(trimmed).then((contents) => {
        const filtered = contents.filter((c) => {
          const matchesCategory = catalogFilter === 'all' ? true : c.tipo === catalogFilter
          const genres = genreMap[c.id] ?? []
          const matchesGenre =
            genreFilter === 'all'
              ? true
              : genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase())
          return matchesCategory && matchesGenre
        })
        setSearchResults(filtered.map(mapCatalogToContentItem))
        setIsSearching(false)
      }).catch(() => {
        setIsSearching(false)
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [query, catalogFilter, genreFilter, genreMap])

  useEffect(() => {
    if (genreFilter === 'all') return
    if (!availableGenres.includes(genreFilter)) {
      setGenreFilter('all')
    }
  }, [availableGenres, genreFilter])

  const activeFilterSummary = useMemo(() => {
    const categoryText =
      catalogFilter === 'all'
        ? 'peliculas y series'
        : catalogFilter === 'pelicula'
          ? 'peliculas'
          : 'series'
    const genreText = genreFilter === 'all' ? 'todos los generos' : genreFilter
    return `Mostrando ${categoryText} de ${genreText}`
  }, [catalogFilter, genreFilter])

  const searchPlaceholder = useMemo(() => {
    if (genreFilter !== 'all') return `Buscar en ${genreFilter}...`
    if (catalogFilter === 'pelicula') return 'Buscar peliculas por titulo o genero...'
    if (catalogFilter === 'serie') return 'Buscar series por titulo o genero...'
    return 'Buscar por titulo, categoria o genero...'
  }, [catalogFilter, genreFilter])

  const filterSummary = useMemo(() => {
    return activeFilterSummary
  }, [activeFilterSummary])

  const isQueryActive = query.trim().length > 0
  const greeting = activeProfile ? `Perfil activo: ${activeProfile.nombre}` : 'Explora la cartelera'

  return (
    <div className="min-h-screen bg-[#080c14]">
      <DashboardHero {...featured} />

      <div className="relative z-10 -mt-2">
        <div className="mb-8 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm text-[var(--color-denim-400)]">
              {isQueryActive ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${query}"` : greeting}
            </p>
            {!isQueryActive ? (
              <p className="mt-1 text-xs text-[var(--color-denim-600)]">{filterSummary}</p>
            ) : null}
          </div>
          <SearchBar value={query} onChange={setQuery} placeholder={searchPlaceholder} />
        </div>

        <div className="mb-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                    onClick={() => setCatalogFilter(filterOption.id as CatalogFilter)}
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
        </div>

        {!isLoadingSubscription && !hasSubscription && (
          <div className="mb-8 px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-denim-300)]">
                    Modo preview
                  </p>
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    Tu cuenta ya puede explorar la cartelera
                  </h2>
                  <p className="max-w-2xl text-sm text-[var(--color-denim-200)]">
                    Puedes navegar por el catalogo, buscar contenido y revisar detalles. Para reproducir contenido completo
                    y habilitar perfiles adicionales, primero activa un plan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/subscription/plans">
                    <Button size="md">Ver planes</Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" size="md">Mi cuenta</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoadingSubscription && hasSubscription && !activeProfile && (
          <div className="mb-8 px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0d1220] p-5">
              <h2 className="mb-2 text-xl font-bold text-white">Elige tu perfil para continuar</h2>
              <p className="mb-4 text-sm text-[var(--color-denim-300)]">
                Tu suscripcion ya esta activa. Ahora selecciona un perfil para personalizar historial, preferencias y reproduccion.
              </p>
              <Link to="/profiles">
                <Button size="md">Ir a perfiles</Button>
              </Link>
            </div>
          </div>
        )}

        {catalogError && (
          <div className="mb-8 px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {catalogError}
            </div>
          </div>
        )}

        {isLoadingCatalog ? (
          <div className="flex min-h-[320px] items-center justify-center px-4 text-white">
            Cargando catalogo...
          </div>
        ) : isQueryActive ? (
          <ScrollReveal variant="fade-up" key={query}>
            <div className="mb-10 px-4 sm:px-6 lg:px-8">
              {isSearching ? (
                <div className="flex min-h-[220px] items-center justify-center text-white">
                  Buscando...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {searchResults.map((item, i) => (
                    <ScrollReveal key={item.title} variant="fade-up" delay={i * 40}>
                      <div className="relative">
                        <MediaCard {...item} onClick={() => navigate(`/movie/${item.id}`)} />
                        {!hasSubscription && (
                          <div className="absolute inset-0 rounded-2xl bg-black/35 pointer-events-none" />
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0d1220]">
                    <Search size={28} strokeWidth={1.25} className="text-[var(--color-denim-700)]" />
                  </div>
                  <p className="text-sm text-[var(--color-denim-400)]">
                    No se encontraron coincidencias para <span className="font-medium text-white">"{query}"</span>
                  </p>
                  <button
                    onClick={() => setQuery('')}
                    className="flex items-center gap-1.5 text-xs text-[var(--color-denim-500)] transition-colors duration-200 hover:text-white"
                  >
                    <X size={13} />
                    Limpiar busqueda
                  </button>
                </div>
              )}
            </div>
          </ScrollReveal>
        ) : filteredContent.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-xl font-semibold text-white">No hay contenido para este filtro.</p>
            <p className="max-w-xl text-sm text-[var(--color-denim-400)]">
              Ajusta la categoria o el genero para explorar mejor el catalogo disponible.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10 pb-16">
            {!hasSubscription && !isLoadingSubscription && (
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[var(--color-denim-300)]">
                  <Lock size={13} />
                  Reproduccion completa y perfiles premium disponibles con suscripcion activa
                </div>
              </div>
            )}

            {rows.map(({ id, title, items }, rowIdx) => (
              <ScrollReveal key={id} variant="fade-up" delay={rowIdx * 80}>
                <ContentRow
                  title={title}
                  items={items}
                  onSelectItem={(item) => navigate(`/movie/${item.id}`)}
                />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
