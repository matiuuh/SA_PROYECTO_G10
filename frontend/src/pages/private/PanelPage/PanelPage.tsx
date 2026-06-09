import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X, Lock } from 'lucide-react'
import { ContentRow, SearchBar, MediaCard } from '@/components/molecules'
import { Button, ScrollReveal } from '@/components/atoms'
import { DashboardHero } from '@/components/organisms'
import { getActiveSession, getStoredActiveProfile, syncStoredActiveProfile } from '@/lib/auth'
import { listCatalogContent } from '@/lib/catalogo-api'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import { listProfiles } from '@/lib/usuario-api'
import type { CatalogContent } from '@/types/catalog'
import type { ContentItem } from '@/components/molecules'

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function getTypeLabel(type: string): string {
  return type === 'serie' ? 'Serie' : 'Pelicula'
}

function mapCatalogToContentItem(content: CatalogContent): ContentItem {
  return {
    id: content.id,
    title: content.titulo,
    genre: getTypeLabel(content.tipo),
    year: getReleaseYear(content.fecha_lanzamiento),
    rating: Math.max(0, Math.min(10, content.porcentaje_recomendacion / 10)),
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

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!accountId || !accessToken) {
        setIsLoadingSubscription(false)
        return
      }

      try {
        const [status, profiles] = await Promise.all([
          getSubscriptionStatusByAccount(accountId),
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
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : 'No se pudo mostrar el catalogo.')
      } finally {
        setIsLoadingCatalog(false)
      }
    }

    void loadCatalog()
  }, [])

  const allContent = useMemo(
    () => catalog.map(mapCatalogToContentItem),
    [catalog],
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
          rating: Math.max(0, Math.min(10, topContent.porcentaje_recomendacion / 10)),
        }
      : {
          title: 'Catalogo Quetzal TV',
          description: 'Explora las peliculas y series disponibles en la plataforma.',
          genre: 'Streaming',
          year: new Date().getFullYear(),
          rating: 0,
        }
  }, [catalog])

  const rows = useMemo(() => {
    const recommended = allContent
      .filter((item) => item.rating >= 7)
      .slice(0, 8)
    const movies = allContent
      .filter((item) => item.genre === 'Pelicula')
      .slice(0, 8)
    const series = allContent
      .filter((item) => item.genre === 'Serie')
      .slice(0, 8)
    const recent = [...allContent]
      .sort((left, right) => right.year - left.year)
      .slice(0, 8)

    return [
      { id: 'recommended', title: 'Recomendacion global', items: recommended },
      { id: 'movies', title: 'Peliculas disponibles', items: movies },
      { id: 'series', title: 'Series disponibles', items: series },
      { id: 'recent', title: 'Estrenos y recientes', items: recent },
    ].filter((row) => row.items.length > 0)
  }, [allContent])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allContent.filter(
      (content) =>
        content.title.toLowerCase().includes(q) ||
        content.genre.toLowerCase().includes(q),
    )
  }, [allContent, query])

  const isSearching = query.trim().length > 0
  const greeting = activeProfile ? `Perfil activo: ${activeProfile.nombre}` : 'Explora la cartelera'

  return (
    <div className="min-h-screen bg-[#080c14]">
      <DashboardHero {...featured} />

      <div className="relative z-10 -mt-2">
        <div className="mb-8 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-[var(--color-denim-400)]">
            {isSearching ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${query}"` : greeting}
          </p>
          <SearchBar value={query} onChange={setQuery} />
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
        ) : isSearching ? (
          <ScrollReveal variant="fade-up" key={query}>
            <div className="mb-10 px-4 sm:px-6 lg:px-8">
              {searchResults.length > 0 ? (
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
                    No se encontraron titulos para <span className="font-medium text-white">"{query}"</span>
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
        ) : allContent.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-xl font-semibold text-white">El catalogo esta vacio.</p>
            <p className="max-w-xl text-sm text-[var(--color-denim-400)]">
              Todavia no hay peliculas o series disponibles para mostrar en la plataforma.
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
