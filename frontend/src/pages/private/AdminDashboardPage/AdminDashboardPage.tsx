import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, List, Tv2 } from 'lucide-react'
import { Button, ScrollReveal } from '@/components/atoms'
import { MediaCard } from '@/components/molecules'
import { getActiveSession } from '@/lib/auth'
import { listAdminCatalogContent } from '@/lib/catalogo-api'
import type { CatalogContent } from '@/types/catalog'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadCatalog() {
      try {
        if (!session?.accessToken) {
          setErrorMessage('Tu sesion ya no esta activa. Inicia sesion nuevamente.')
          return
        }
        const contents = await listAdminCatalogContent(session.accessToken)
        setCatalog(contents)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el catalogo administrativo.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadCatalog()
  }, [session?.accessToken])

  const stats = useMemo(() => {
    const movies = catalog.filter((item) => item.tipo === 'pelicula')
    const series = catalog.filter((item) => item.tipo === 'serie')
    const scheduled = catalog.filter((item) => {
      if (!item.fecha_lanzamiento) return false
      return new Date(`${item.fecha_lanzamiento}T00:00:00`).getTime() > Date.now()
    })

    return {
      total: catalog.length,
      movies: movies.length,
      series: series.length,
      scheduled: scheduled.length,
      latest: [...catalog]
        .sort((a, b) => {
          const left = a.fecha_lanzamiento ? new Date(a.fecha_lanzamiento).getTime() : 0
          const right = b.fecha_lanzamiento ? new Date(b.fecha_lanzamiento).getTime() : 0
          return right - left
        })
        .slice(0, 4),
    }
  }, [catalog])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <ScrollReveal variant="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Panel administrativo</h2>
            <p className="text-sm text-[var(--color-denim-400)] mt-0.5">
              Desde aqui puedes registrar contenido nuevo y revisar la cartelera real de la plataforma.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/upload/series')}>
              <Tv2 size={14} />
              Subir serie
            </Button>
            <Button size="sm" onClick={() => navigate('/admin/upload/movie')}>
              <Film size={14} />
              Subir pelicula
            </Button>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="fade-up" delay={40}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
            <p className="text-sm text-[var(--color-denim-400)]">Contenido total</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
            <p className="text-sm text-[var(--color-denim-400)]">Peliculas</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.movies}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
            <p className="text-sm text-[var(--color-denim-400)]">Series</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.series}</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
            <p className="text-sm text-[var(--color-denim-400)]">Programados</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.scheduled}</p>
          </div>
        </div>
      </ScrollReveal>

      <div className="mb-8">
        <ScrollReveal variant="fade-up" delay={120}>
          <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <List size={15} className="text-[var(--color-denim-500)]" />
                <h3 className="text-sm font-semibold text-white">Contenido reciente del catalogo</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin/catalog')}>
                Ver catalogo
              </Button>
            </div>

            {isLoading ? (
              <div className="flex min-h-[240px] items-center justify-center text-white">
                Cargando contenido...
              </div>
            ) : errorMessage ? (
              <div className="px-5 py-6 text-sm text-red-300">{errorMessage}</div>
            ) : stats.latest.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-lg font-semibold text-white">Todavia no hay contenido registrado.</p>
                <p className="mt-2 text-sm text-[var(--color-denim-400)]">
                  Usa los botones de arriba para publicar la primera pelicula o serie.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                {stats.latest.map((item) => (
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
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
