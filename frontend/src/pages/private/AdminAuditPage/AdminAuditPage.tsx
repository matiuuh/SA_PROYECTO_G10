import { useEffect, useMemo, useState } from 'react'
import { Download, FileClock, FileText, RefreshCcw } from 'lucide-react'
import { Button, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { listCatalogAudit } from '@/lib/catalogo-api'
import type { CatalogAuditEntry } from '@/types/catalog'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatEvent(event: string): string {
  const labels: Record<string, string> = {
    insercion: 'Insercion',
    actualizacion: 'Actualizacion',
    eliminacion: 'Eliminacion',
  }
  return labels[event] ?? event
}

function getEventClasses(event: string): string {
  if (event === 'insercion') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  if (event === 'actualizacion') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  if (event === 'eliminacion') return 'border-red-400/30 bg-red-400/10 text-red-200'
  return 'border-white/15 bg-white/5 text-[var(--color-denim-200)]'
}

function compactJson(value: Record<string, unknown> | null): string {
  if (!value) return 'null'
  return JSON.stringify(value)
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(entries: CatalogAuditEntry[]) {
  const headers = [
    'fecha_evento',
    'evento',
    'tabla_origen',
    'entidad_id',
    'usuario_accion',
    'estado_anterior',
    'estado_nuevo',
  ]
  const rows = entries.map((entry) => [
    entry.fecha_evento,
    entry.evento,
    entry.tabla_origen,
    entry.entidad_id,
    entry.usuario_accion ?? '',
    compactJson(entry.estado_anterior),
    compactJson(entry.estado_nuevo),
  ])
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `auditoria-catalogo-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function printPdf(entries: CatalogAuditEntry[]) {
  const generatedAt = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date())

  const rows = entries.map((entry) => {
    const changedKeys = getChangedKeys(entry)
    const changes =
      changedKeys.length > 0
        ? changedKeys.join(', ')
        : compactJson(entry.estado_nuevo ?? entry.estado_anterior)

    return `
      <tr>
        <td>${escapeHtml(formatDate(entry.fecha_evento))}</td>
        <td>${escapeHtml(formatEvent(entry.evento))}</td>
        <td>${escapeHtml(entry.tabla_origen)}</td>
        <td>${escapeHtml(entry.entidad_id)}</td>
        <td>${escapeHtml(entry.usuario_accion || 'Sin usuario')}</td>
        <td>${escapeHtml(changes)}</td>
      </tr>
    `
  }).join('')

  const html = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Auditoria de catalogo</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 32px;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }
          .meta {
            margin-bottom: 22px;
            color: #4b5563;
            font-size: 12px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 22px;
          }
          .summary div {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
          }
          .summary strong {
            display: block;
            font-size: 20px;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 7px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
          }
          th {
            background: #f3f4f6;
            font-size: 10px;
            text-transform: uppercase;
          }
          @media print {
            body { margin: 18mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Auditoria de catalogo</h1>
        <div class="meta">Generado: ${escapeHtml(generatedAt)}</div>
        <section class="summary">
          <div>Eventos<strong>${entries.length}</strong></div>
          <div>Inserciones<strong>${entries.filter((entry) => entry.evento === 'insercion').length}</strong></div>
          <div>Actualizaciones<strong>${entries.filter((entry) => entry.evento === 'actualizacion').length}</strong></div>
          <div>Eliminaciones<strong>${entries.filter((entry) => entry.evento === 'eliminacion').length}</strong></div>
        </section>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Evento</th>
              <th>Tabla</th>
              <th>Entidad</th>
              <th>Usuario</th>
              <th>Cambios</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.addEventListener('load', () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800')
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

function getChangedKeys(entry: CatalogAuditEntry): string[] {
  if (!entry.estado_anterior || !entry.estado_nuevo) return []
  return Object.keys(entry.estado_nuevo).filter((key) => {
    return JSON.stringify(entry.estado_anterior?.[key]) !== JSON.stringify(entry.estado_nuevo?.[key])
  })
}

export function AdminAuditPage() {
  const session = getActiveSession()
  const [entries, setEntries] = useState<CatalogAuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  async function loadAudit() {
    if (!session?.accessToken) {
      setErrorMessage('Tu sesion ya no esta activa. Inicia sesion nuevamente.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await listCatalogAudit(session.accessToken, 150)
      setEntries(data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la auditoria.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAudit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])

  const stats = useMemo(() => {
    return {
      total: entries.length,
      inserts: entries.filter((entry) => entry.evento === 'insercion').length,
      updates: entries.filter((entry) => entry.evento === 'actualizacion').length,
      deletes: entries.filter((entry) => entry.evento === 'eliminacion').length,
    }
  }, [entries])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ScrollReveal variant="fade-up">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/15">
              <FileClock size={20} className="text-[var(--color-denim-300)]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Auditoria de catalogo</h2>
              <p className="text-sm text-[var(--color-denim-400)]">
                Registro transaccional generado por triggers de base de datos.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void loadAudit()} disabled={isLoading}>
              <RefreshCcw size={15} />
              Actualizar
            </Button>
            <Button onClick={() => downloadCsv(entries)} disabled={entries.length === 0}>
              <Download size={15} />
              Descargar CSV
            </Button>
            <Button variant="outline" onClick={() => printPdf(entries)} disabled={entries.length === 0}>
              <FileText size={15} />
              Descargar PDF
            </Button>
          </div>
        </div>
      </ScrollReveal>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Eventos</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Inserciones</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.inserts}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Actualizaciones</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.updates}</p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0f1c] p-5">
          <p className="text-sm text-[var(--color-denim-400)]">Eliminaciones</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.deletes}</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0a0f1c]">
        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center text-white">
            Cargando auditoria...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-semibold text-white">Todavia no hay eventos de auditoria.</p>
            <p className="mt-2 max-w-lg text-sm text-[var(--color-denim-400)]">
              Crea, edita o elimina contenido para generar registros transaccionales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Evento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Tabla</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {entries.map((entry) => {
                  const changedKeys = getChangedKeys(entry)
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--color-denim-200)]">
                        {formatDate(entry.fecha_evento)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getEventClasses(entry.evento)}`}>
                          {formatEvent(entry.evento)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white">{entry.tabla_origen}</td>
                      <td className="max-w-[180px] px-4 py-4 text-xs text-[var(--color-denim-400)]">
                        <span className="break-all">{entry.entidad_id}</span>
                      </td>
                      <td className="max-w-[180px] px-4 py-4 text-xs text-[var(--color-denim-400)]">
                        <span className="break-all">{entry.usuario_accion || 'Sin usuario'}</span>
                      </td>
                      <td className="min-w-[280px] px-4 py-4">
                        {changedKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {changedKeys.slice(0, 8).map((key) => (
                              <span key={key} className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs text-[var(--color-denim-300)]">
                                {key}
                              </span>
                            ))}
                            {changedKeys.length > 8 ? (
                              <span className="text-xs text-[var(--color-denim-500)]">+{changedKeys.length - 8}</span>
                            ) : null}
                          </div>
                        ) : (
                          <pre className="max-h-24 overflow-auto rounded-lg bg-[#080c14] p-3 text-xs text-[var(--color-denim-300)]">
                            {JSON.stringify(entry.estado_nuevo ?? entry.estado_anterior, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
