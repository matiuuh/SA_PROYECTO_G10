import type { CatalogContent } from '@/types/catalog'
import { Link } from 'react-router-dom'
import { SectionHeading, MovieCard } from '@/components/molecules'
import { Button, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function getTypeLabel(type: string): string {
  return type === 'serie' ? 'Serie' : 'Pelicula'
}

interface CatalogSectionProps {
  catalog: CatalogContent[]
}

export function CatalogSection({ catalog }: CatalogSectionProps) {
  const session = getActiveSession()
  const catalogTarget = session ? '/panel' : '/register'
  const featuredCatalog = [...catalog]
    .sort((left, right) => right.porcentaje_recomendacion - left.porcentaje_recomendacion)
    .slice(0, 8)

  return (
    <section id="catalog" className="relative py-24 bg-[#0a0e19] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 30% at 0% 50%, rgba(22,95,180,0.12) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-right" className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <SectionHeading
            eyebrow="Catalogo"
            title="Titulos destacados"
            subtitle="Una muestra real de los titulos disponibles actualmente en la plataforma."
          />
          <Link to={catalogTarget}>
            <Button variant="outline">Ver catalogo completo</Button>
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {featuredCatalog.map((movie, i) => (
            <ScrollReveal key={movie.id} variant="fade-up" delay={i * 60}>
              <MovieCard
                title={movie.titulo}
                genre={getTypeLabel(movie.tipo)}
                year={getReleaseYear(movie.fecha_lanzamiento)}
                rating={
                  movie.porcentaje_recomendacion > 0
                    ? Math.max(0, Math.min(10, movie.porcentaje_recomendacion / 10))
                    : null
                }
                posterUrl={movie.url_portada}
                isNew={getReleaseYear(movie.fecha_lanzamiento) >= new Date().getFullYear() - 1}
              />
            </ScrollReveal>
          ))}
        </div>

        {featuredCatalog.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d1220] px-6 py-12 text-center text-sm text-[var(--color-denim-300)]">
            Aun no hay titulos publicados en el catalogo.
          </div>
        ) : null}
      </div>
    </section>
  )
}
