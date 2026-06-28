import { useCallback, useEffect, useState } from 'react'
import { Download, ExternalLink, Lock, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms'
import { getActiveSession, getStoredActiveProfile } from '@/lib/auth'
import {
  listDownloads,
  removeDownload,
  type OfflineDownload,
} from '@/lib/offline-downloads'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'

function formatDownloadedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida'
  return date.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function DownloadsPage() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const [downloads, setDownloads] = useState<OfflineDownload[]>([])
  const [canDownload, setCanDownload] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [removingId, setRemovingId] = useState('')

  const loadPage = useCallback(async () => {
    if (!session?.account.id) {
      navigate('/login', { replace: true })
      return
    }
    if (!activeProfile?.id) {
      navigate('/profiles', { replace: true, state: { reason: 'select-profile' } })
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const status = await getSubscriptionStatusByAccount(session.account.id)
      setCanDownload(status.puede_descargar)
      if (status.puede_descargar) {
        setDownloads(await listDownloads(session.account.id, activeProfile.id))
      } else {
        setDownloads([])
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudieron consultar las descargas.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [activeProfile?.id, navigate, session?.account.id])

  useEffect(() => {
    // The callback performs asynchronous browser/API synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage()
  }, [loadPage])

  const handleRemove = async (download: OfflineDownload) => {
    const storageId = `${download.contentId}:${download.episodeId ?? 'movie'}`
    setRemovingId(storageId)
    setErrorMessage('')
    try {
      await removeDownload(
        download.accountId,
        download.profileId,
        download.contentId,
        download.episodeId,
      )
      setDownloads((current) => current.filter(
        (item) => item.contentId !== download.contentId || item.episodeId !== download.episodeId,
      ))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar la descarga.',
      )
    } finally {
      setRemovingId('')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-white">
        Consultando descargas...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14] py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start gap-4">
          <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-200">
            <Download size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Mis descargas</h1>
            <p className="mt-2 text-sm text-[var(--color-denim-300)]">
              Contenido simulado guardado de forma cifrada para el perfil {activeProfile?.nombre}.
              Para reproducirlo se abrirá el contenido en línea.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {!canDownload ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-8 text-center">
            <Lock className="mx-auto text-amber-200" size={36} />
            <h2 className="mt-4 text-xl font-semibold text-white">Plan Premium requerido</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-amber-100/75">
              Tus registros locales permanecen cifrados, pero sólo podrás consultarlos y abrirlos
              mientras tengas un Plan Premium activo.
            </p>
            <Link to="/subscription/plans" className="mt-6 inline-block">
              <Button>Ver Plan Premium</Button>
            </Link>
          </div>
        ) : downloads.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
            <Download className="mx-auto text-[var(--color-denim-500)]" size={34} />
            <h2 className="mt-4 text-lg font-semibold text-white">Aún no tienes descargas</h2>
            <p className="mt-2 text-sm text-[var(--color-denim-400)]">
              Abre una película o un episodio y utiliza el botón de descarga.
            </p>
            <Link to="/panel" className="mt-6 inline-block">
              <Button>Explorar catálogo</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {downloads.map((download) => {
              const storageId = `${download.contentId}:${download.episodeId ?? 'movie'}`
              const target = `/movie/${download.contentId}${
                download.episodeId ? `?episode=${encodeURIComponent(download.episodeId)}` : ''
              }`
              return (
                <article
                  key={storageId}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1220]"
                >
                  <div className="aspect-video bg-white/[0.04]">
                    {download.posterUrl ? (
                      <img
                        src={download.posterUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--color-denim-500)]">
                        <Download size={30} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-emerald-300">
                      {download.episodeId ? 'Episodio' : download.type}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{download.title}</h2>
                    {download.episodeTitle ? (
                      <p className="mt-1 text-sm text-[var(--color-denim-300)]">
                        {download.episodeTitle}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-[var(--color-denim-500)]">
                      Guardado {formatDownloadedAt(download.downloadedAt)}
                    </p>
                    <div className="mt-5 flex gap-2">
                      <Link
                        to={target}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#080c14] transition-opacity hover:opacity-90"
                      >
                        <ExternalLink size={15} />
                        Abrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => { void handleRemove(download) }}
                        disabled={removingId === storageId}
                        className="rounded-lg border border-red-400/20 px-3 text-red-200 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                        aria-label={`Eliminar descarga de ${download.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
