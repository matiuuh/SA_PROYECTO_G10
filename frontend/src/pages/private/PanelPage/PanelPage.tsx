import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, Lock } from 'lucide-react'
import { ContentRow, SearchBar, MediaCard } from '@/components/molecules'
import { Button, ScrollReveal } from '@/components/atoms'
import { DashboardHero } from '@/components/organisms'
import { getActiveSession, getStoredActiveProfile } from '@/lib/auth'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'
import type { ContentItem } from '@/components/molecules'

const FEATURED = {
  title: 'El Ultimo Horizonte',
  description:
    'En un futuro donde los limites entre la realidad y la simulacion se han difuminado, una exploradora descubre una senal que podria cambiar para siempre el destino de la humanidad.',
  genre: 'Ciencia ficcion',
  year: 2024,
  rating: 8.7,
}

const CONTINUE_WATCHING: ContentItem[] = [
  { title: 'El Ultimo Horizonte', genre: 'Ciencia ficcion', year: 2024, rating: 8.7, isNew: true },
  { title: 'Sombras del Olvido', genre: 'Thriller', year: 2024, rating: 7.9, isNew: true },
  { title: 'La Gran Aventura', genre: 'Aventura', year: 2023, rating: 8.2 },
  { title: 'Corazon de Acero', genre: 'Drama', year: 2023, rating: 7.5 },
]

const TRENDING: ContentItem[] = [
  { title: 'Amor en Paris', genre: 'Romance', year: 2024, rating: 7.3 },
  { title: 'El Detective', genre: 'Misterio', year: 2023, rating: 8.5 },
  { title: 'Frontera Oscura', genre: 'Accion', year: 2024, rating: 7.8, isNew: true },
  { title: 'Mundos Paralelos', genre: 'Ciencia ficcion', year: 2024, rating: 8.1, isNew: true },
  { title: 'La Ultima Sinfonia', genre: 'Drama', year: 2023, rating: 7.6 },
  { title: 'Cazadores de Sombras', genre: 'Fantasia', year: 2023, rating: 8.3 },
]

const NEW_RELEASES: ContentItem[] = [
  { title: 'Tormenta Digital', genre: 'Thriller', year: 2024, rating: 7.4, isNew: true },
  { title: 'Viento del Norte', genre: 'Drama', year: 2024, rating: 8.0, isNew: true },
  { title: 'Ciudad Fantasma', genre: 'Terror', year: 2024, rating: 7.2, isNew: true },
  { title: 'Codigo Rojo', genre: 'Accion', year: 2024, rating: 7.9, isNew: true },
  { title: 'El Retorno', genre: 'Misterio', year: 2024, rating: 8.2, isNew: true },
]

const MY_LIST: ContentItem[] = [
  { title: 'Sombras del Olvido', genre: 'Thriller', year: 2024, rating: 7.9 },
  { title: 'El Detective', genre: 'Misterio', year: 2023, rating: 8.5 },
  { title: 'Cazadores', genre: 'Fantasia', year: 2023, rating: 8.3 },
  { title: 'Noche Sin Fin', genre: 'Terror', year: 2024, rating: 7.1 },
]

const ALL_CONTENT = [
  ...new Map([...CONTINUE_WATCHING, ...TRENDING, ...NEW_RELEASES, ...MY_LIST].map((item) => [item.title, item])).values(),
]

const ROWS = [
  { id: 'continue', title: 'Continuar viendo', items: CONTINUE_WATCHING },
  { id: 'trending', title: 'Tendencias ahora', items: TRENDING },
  { id: 'new', title: 'Nuevos lanzamientos', items: NEW_RELEASES },
  { id: 'mylist', title: 'Mi lista', items: MY_LIST },
]

export function PanelPage() {
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const [query, setQuery] = useState('')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true)

  useEffect(() => {
    async function loadSubscriptionStatus() {
      if (!session) {
        setIsLoadingSubscription(false)
        return
      }

      try {
        const status = await getSubscriptionStatusByAccount(session.account.id)
        setHasSubscription(status.tiene_suscripcion)
      } finally {
        setIsLoadingSubscription(false)
      }
    }

    void loadSubscriptionStatus()
  }, [session])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return ALL_CONTENT.filter((c) => c.title.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q))
  }, [query])

  const isSearching = query.trim().length > 0
  const greeting = activeProfile ? `Perfil activo: ${activeProfile.nombre}` : 'Explora la cartelera'

  return (
    <div className="min-h-screen bg-[#080c14]">
      <DashboardHero {...FEATURED} />

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

        {isSearching ? (
          <ScrollReveal variant="fade-up" key={query}>
            <div className="mb-10 px-4 sm:px-6 lg:px-8">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {searchResults.map((item, i) => (
                    <ScrollReveal key={item.title} variant="fade-up" delay={i * 40}>
                      <div className="relative">
                        <MediaCard {...item} />
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

            {ROWS.map(({ id, title, items }, rowIdx) => (
              <ScrollReveal key={id} variant="fade-up" delay={rowIdx * 80}>
                <ContentRow title={title} items={items} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
