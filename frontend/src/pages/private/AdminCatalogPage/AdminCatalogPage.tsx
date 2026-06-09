import { Film, Info, List, Tv2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ScrollReveal } from '@/components/atoms'
import { MediaCard } from '@/components/molecules'
import { listCatalogContent } from '@/lib/catalogo-api'
import type { CatalogContent } from '@/types/catalog'

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
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadCatalog() {
      try {
        const contents = await listCatalogContent()
        setCatalog(contents)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo mostrar el catalogo.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadCatalog()
  }, [])

  const stats = useMemo(() => {
    const movies = catalog.filter((item) => item.tipo === 'pelicula').length
    const series = catalog.filter((item) => item.tipo === 'serie').length
    return {
      total: catalog.length,
      movies,
      series,
    }
  }, [catalog])

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

      <ScrollReveal variant="fade-up" delay={40}>
        <div className="rounded-2xl border border-[var(--color-warning)]/25 bg-[var(--color-warning)]/10 p-5 mb-8">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Estado de integracion</p>
              <p className="text-sm text-[var(--color-denim-300)] mt-1">
                Esta vista ya consume el catalogo vigente de la plataforma. Desde aqui puedes revisar el contenido
                publicado y continuar al flujo de carga administrativa.
              </p>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {CATALOG_SECTIONS.map((section, index) => (
          <ScrollReveal key={section.title} variant="fade-up" delay={80 + index * 40}>
            <section className="rounded-2xl border border-white/[0.07] bg-[#0a0f1c] p-6 h-full">
              <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[var(--color-denim-300)] mb-4">
                {section.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{section.title}</h3>
              <p className="text-sm text-[var(--color-denim-400)] mb-6">{section.description}</p>
              <Button onClick={() => navigate(section.actionTo)}>
                <Upload size={15} />
                {section.actionLabel}
              </Button>
            </section>
          </ScrollReveal>
        ))}
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
          </div>

          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-white">
              Cargando catalogo...
            </div>
          ) : catalog.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <p className="text-lg font-semibold text-white">El catalogo esta vacio.</p>
              <p className="max-w-lg text-sm text-[var(--color-denim-400)]">
                Todavia no hay contenido disponible. Usa las acciones de carga para publicar una pelicula o una serie.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.map((item) => (
                <MediaCard
                  key={item.id}
                  title={item.titulo}
                  genre={item.tipo === 'serie' ? 'Serie' : 'Pelicula'}
                  year={item.fecha_lanzamiento ? Number(item.fecha_lanzamiento.slice(0, 4)) : new Date().getFullYear()}
                  rating={Math.max(0, Math.min(10, item.porcentaje_recomendacion / 10))}
                  posterUrl={item.url_portada}
                  isNew={item.fecha_lanzamiento ? Number(item.fecha_lanzamiento.slice(0, 4)) >= new Date().getFullYear() - 1 : false}
                />
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>
    </div>
  )
}
