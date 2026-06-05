import { Link } from 'react-router-dom'
import { SectionHeading, MovieCard } from '@/components/molecules'
import { Button, ScrollReveal } from '@/components/atoms'

const SAMPLE_MOVIES = [
  { title: 'El Último Horizonte', genre: 'Ciencia ficción', year: 2024, rating: 8.7, isNew: true },
  { title: 'Sombras del Olvido', genre: 'Thriller',         year: 2024, rating: 7.9, isNew: true },
  { title: 'La Gran Aventura',   genre: 'Aventura',         year: 2023, rating: 8.2, isNew: false },
  { title: 'Corazón de Acero',   genre: 'Drama',            year: 2023, rating: 7.5, isNew: false },
  { title: 'Noche Sin Fin',      genre: 'Terror',           year: 2024, rating: 7.1, isNew: true },
  { title: 'Velocidad Máxima',   genre: 'Acción',           year: 2023, rating: 8.0, isNew: false },
  { title: 'Amor en París',      genre: 'Romance',          year: 2024, rating: 7.3, isNew: false },
  { title: 'El Detective',       genre: 'Misterio',         year: 2023, rating: 8.5, isNew: false },
]

export function CatalogSection() {
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
            eyebrow="Catálogo"
            title="Títulos destacados"
            subtitle="Una muestra de los mejores títulos disponibles en nuestra plataforma."
          />
          <Link to="/register">
            <Button variant="outline">Ver catálogo completo</Button>
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {SAMPLE_MOVIES.map((movie, i) => (
            <ScrollReveal key={movie.title} variant="fade-up" delay={i * 60}>
              <MovieCard {...movie} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
