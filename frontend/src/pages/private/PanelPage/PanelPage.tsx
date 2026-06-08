import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { ContentRow, SearchBar, MediaCard } from '@/components/molecules'
import { DashboardHero } from '@/components/organisms'
import { ScrollReveal } from '@/components/atoms'
import type { ContentItem } from '@/components/molecules'

const FEATURED = {
  title: 'El Último Horizonte',
  description:
    'En un futuro donde los límites entre la realidad y la simulación se han difuminado, una exploradora descubre una señal que podría cambiar para siempre el destino de la humanidad.',
  genre: 'Ciencia ficción',
  year: 2024,
  rating: 8.7,
}

const CONTINUE_WATCHING: ContentItem[] = [
  { title: 'El Último Horizonte', genre: 'Ciencia ficción', year: 2024, rating: 8.7, isNew: true },
  { title: 'Sombras del Olvido',  genre: 'Thriller',        year: 2024, rating: 7.9, isNew: true },
  { title: 'La Gran Aventura',    genre: 'Aventura',        year: 2023, rating: 8.2 },
  { title: 'Corazón de Acero',    genre: 'Drama',           year: 2023, rating: 7.5 },
  { title: 'Noche Sin Fin',       genre: 'Terror',          year: 2024, rating: 7.1, isNew: true },
  { title: 'Velocidad Máxima',    genre: 'Acción',          year: 2023, rating: 8.0 },
]

const TRENDING: ContentItem[] = [
  { title: 'Amor en París',         genre: 'Romance',          year: 2024, rating: 7.3 },
  { title: 'El Detective',          genre: 'Misterio',         year: 2023, rating: 8.5 },
  { title: 'Frontera Oscura',       genre: 'Acción',           year: 2024, rating: 7.8, isNew: true },
  { title: 'Mundos Paralelos',      genre: 'Ciencia ficción',  year: 2024, rating: 8.1, isNew: true },
  { title: 'La Última Sinfonía',    genre: 'Drama',            year: 2023, rating: 7.6 },
  { title: 'Cazadores de Sombras',  genre: 'Fantasía',         year: 2023, rating: 8.3 },
]

const NEW_RELEASES: ContentItem[] = [
  { title: 'Tormenta Digital',   genre: 'Thriller',        year: 2024, rating: 7.4, isNew: true },
  { title: 'Viento del Norte',   genre: 'Drama',           year: 2024, rating: 8.0, isNew: true },
  { title: 'Ciudad Fantasma',    genre: 'Terror',          year: 2024, rating: 7.2, isNew: true },
  { title: 'Código Rojo',        genre: 'Acción',          year: 2024, rating: 7.9, isNew: true },
  { title: 'El Retorno',         genre: 'Misterio',        year: 2024, rating: 8.2, isNew: true },
]

const MY_LIST: ContentItem[] = [
  { title: 'Sombras del Olvido', genre: 'Thriller',       year: 2024, rating: 7.9 },
  { title: 'El Detective',       genre: 'Misterio',       year: 2023, rating: 8.5 },
  { title: 'Cazadores',          genre: 'Fantasía',       year: 2023, rating: 8.3 },
  { title: 'Noche Sin Fin',      genre: 'Terror',         year: 2024, rating: 7.1 },
]

const ALL_CONTENT = [...new Map(
  [...CONTINUE_WATCHING, ...TRENDING, ...NEW_RELEASES, ...MY_LIST]
    .map((item) => [item.title, item])
).values()]

const ROWS = [
  { id: 'continue',  title: 'Continuar viendo',  items: CONTINUE_WATCHING },
  { id: 'trending',  title: 'Tendencias ahora',  items: TRENDING },
  { id: 'new',       title: 'Nuevos lanzamientos', items: NEW_RELEASES },
  { id: 'mylist',    title: 'Mi lista',           items: MY_LIST },
]

export function PanelPage() {
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return ALL_CONTENT.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.genre.toLowerCase().includes(q)
    )
  }, [query])

  const isSearching = query.trim().length > 0

  return (
    <div className="min-h-screen bg-[#080c14]">
      <DashboardHero {...FEATURED} />

      <div className="relative z-10 -mt-2">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-8">
          <p className="text-sm text-[var(--color-denim-400)]">
            {isSearching
              ? `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${query}"`
              : 'Buenas noches'}
          </p>
          <SearchBar value={query} onChange={setQuery} />
        </div>

        {isSearching ? (
          <ScrollReveal variant="fade-up" key={query}>
            <div className="px-4 sm:px-6 lg:px-8 mb-10">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {searchResults.map((item, i) => (
                    <ScrollReveal key={item.title} variant="fade-up" delay={i * 40}>
                      <MediaCard {...item} />
                    </ScrollReveal>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#0d1220] border border-white/[0.07] flex items-center justify-center">
                    <Search size={28} strokeWidth={1.25} className="text-[var(--color-denim-700)]" />
                  </div>
                  <p className="text-[var(--color-denim-400)] text-sm">
                    No se encontraron títulos para <span className="text-white font-medium">"{query}"</span>
                  </p>
                  <button
                    onClick={() => setQuery('')}
                    className="flex items-center gap-1.5 text-xs text-[var(--color-denim-500)] hover:text-white transition-colors duration-200"
                  >
                    <X size={13} />
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>
          </ScrollReveal>
        ) : (
          <div className="flex flex-col gap-10 pb-16">
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
