import { Link } from 'react-router-dom'
import { Clapperboard, BookMarked, Clock, Crown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MovieCard, SectionHeading } from '@/components/molecules'
import { Button } from '@/components/atoms'

const RECENT_MOVIES = [
  { title: 'El Último Horizonte', genre: 'Ciencia ficción', year: 2024, rating: 8.7, isNew: true },
  { title: 'Sombras del Olvido',  genre: 'Thriller',        year: 2024, rating: 7.9, isNew: true },
  { title: 'La Gran Aventura',    genre: 'Aventura',        year: 2023, rating: 8.2, isNew: false },
  { title: 'Corazón de Acero',    genre: 'Drama',           year: 2023, rating: 7.5, isNew: false },
]

const STATS: { label: string; value: string; icon: LucideIcon }[] = [
  { label: 'Películas vistas',   value: '24',       icon: Clapperboard },
  { label: 'En mi lista',        value: '12',       icon: BookMarked },
  { label: 'Horas de contenido', value: '48h',      icon: Clock },
  { label: 'Plan actual',        value: 'Estándar', icon: Crown },
]

export function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-1">Bienvenido de nuevo</h1>
        <p className="text-[var(--color-denim-400)]">Aquí tienes un resumen de tu actividad.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[#0d1220] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--color-denim-900)] border border-[var(--color-denim-800)] flex items-center justify-center text-[var(--color-denim-400)]">
              <Icon size={17} strokeWidth={1.75} />
            </div>
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-xs text-[var(--color-denim-400)]">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between mb-6">
        <SectionHeading eyebrow="Para ti" title="Continuar viendo" />
        <Link to="/dashboard/catalog">
          <Button variant="ghost" size="sm">Ver todo</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {RECENT_MOVIES.map((movie) => (
          <MovieCard key={movie.title} {...movie} />
        ))}
      </div>
    </div>
  )
}
