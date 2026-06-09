import { Eye, Film, List, Pencil, Trash2, Tv2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ScrollReveal } from '@/components/atoms'
import { MediaCard } from '@/components/molecules'
import { deleteCatalogContent, listCatalogContent } from '@/lib/catalogo-api'
import { getActiveSession } from '@/lib/auth'
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
  const session = getActiveSession()
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [busyContentId, setBusyContentId] = useState('')

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

  async function refreshCatalog() {
    try {
      const contents = await listCatalogContent()
      setCatalog(contents)
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
                <div key={item.id} className="space-y-3">
                  <MediaCard
                    title={item.titulo}
                    genre={item.tipo === 'serie' ? 'Serie' : 'Pelicula'}
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
                  <div className="grid grid-cols-3 gap-2">
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
