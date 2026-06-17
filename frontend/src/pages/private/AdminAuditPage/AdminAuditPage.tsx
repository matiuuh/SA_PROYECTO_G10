import { useEffect, useMemo, useState } from 'react'
import { Download, FileClock, FileText, RefreshCcw, X, Film, Tv, Info } from 'lucide-react'
import { Button, ScrollReveal } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'
import { listCatalogAudit } from '@/lib/catalogo-api'
import type { CatalogAuditEntry } from '@/types/catalog'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function formatEvent(event: string): string {
  const labels: Record<string, string> = {
    insercion: 'Inserción',
    actualizacion: 'Actualización',
    eliminacion: 'Eliminación',
  }
  return labels[event] ?? event
}

function getEventClasses(event: string): string {
  if (event === 'insercion') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
  if (event === 'actualizacion') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  if (event === 'eliminacion') return 'border-red-400/30 bg-red-400/10 text-red-200'
  return 'border-white/15 bg-white/5 text-[var(--color-denim-200)]'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function downloadExcel(entries: CatalogAuditEntry[]) {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Auditoría</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table {
          border-collapse: collapse;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
        }
        th {
          background-color: #1a1a2e;
          color: #ffffff;
          font-weight: bold;
          padding: 8px 12px;
          border: 1px solid #333;
          text-align: left;
        }
        td {
          padding: 6px 12px;
          border: 1px solid #ccc;
          text-align: left;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background-color: #f9f9f9;
        }
        .evento-insercion { color: #065f46; font-weight: bold; }
        .evento-actualizacion { color: #92400e; font-weight: bold; }
        .evento-eliminacion { color: #991b1b; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Auditoría de Catálogo</h2>
      <p>Generado: ${new Date().toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })}</p>
      <br/>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Tabla</th>
            <th>Título</th>
            <th>Tipo</th>
            <th>ID</th>
            <th>Sinopsis</th>
            <th>Duración (min)</th>
            <th>Fecha Lanzamiento</th>
            <th>Idioma</th>
            <th>Clasificación</th>
            <th>Ficha Técnica</th>
            <th>URL Portada</th>
            <th>URL Tráiler</th>
          </tr>
        </thead>
        <tbody>
  `

  entries.forEach((entry) => {
    const estado = entry.estado_nuevo || entry.estado_anterior || {}
    
    const fecha = formatDate(entry.fecha_evento)
    const evento = formatEvent(entry.evento)
    const tabla = entry.tabla_origen || ''
    const titulo = (estado as any)?.titulo || ''
    const tipo = (estado as any)?.tipo || ''
    const id = entry.entidad_id || ''
    const sinopsis = ((estado as any)?.sinopsis || '').replace(/\n/g, ' ').replace(/\s+/g, ' ')
    const duracion = (estado as any)?.duracion_minutos || ''
    const fechaLanzamiento = (estado as any)?.fecha_lanzamiento || ''
    const idioma = (estado as any)?.idioma || ''
    const clasificacion = (estado as any)?.clasificacion_edad || ''
    const fichaTecnica = ((estado as any)?.ficha_tecnica || '').replace(/\n/g, ' ').replace(/\s+/g, ' ')
    const urlPortada = (estado as any)?.url_portada || ''
    const urlTrailer = (estado as any)?.url_trailer || ''

    const eventoClass = entry.evento === 'insercion' ? 'evento-insercion' :
                        entry.evento === 'actualizacion' ? 'evento-actualizacion' :
                        entry.evento === 'eliminacion' ? 'evento-eliminacion' : ''

    html += `
      <tr>
        <td>${escapeHtml(fecha)}</td>
        <td class="${eventoClass}">${escapeHtml(evento)}</td>
        <td>${escapeHtml(tabla)}</td>
        <td><strong>${escapeHtml(titulo)}</strong></td>
        <td>${escapeHtml(tipo)}</td>
        <td style="font-family: monospace; font-size: 10px;">${escapeHtml(id)}</td>
        <td>${escapeHtml(sinopsis)}</td>
        <td style="text-align: center;">${escapeHtml(duracion)}</td>
        <td>${escapeHtml(fechaLanzamiento)}</td>
        <td>${escapeHtml(idioma)}</td>
        <td>${escapeHtml(clasificacion)}</td>
        <td>${escapeHtml(fichaTecnica)}</td>
        <td style="font-size: 9px; word-break: break-all;">${escapeHtml(urlPortada)}</td>
        <td style="font-size: 9px; word-break: break-all;">${escapeHtml(urlTrailer)}</td>
      </tr>
    `
  })

  html += `
        </tbody>
      </table>
      <br/>
      <p><strong>Resumen:</strong></p>
      <ul>
        <li>Total eventos: ${entries.length}</li>
        <li>Inserciones: ${entries.filter(e => e.evento === 'insercion').length}</li>
        <li>Actualizaciones: ${entries.filter(e => e.evento === 'actualizacion').length}</li>
        <li>Eliminaciones: ${entries.filter(e => e.evento === 'eliminacion').length}</li>
      </ul>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `auditoria-catalogo-${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function printPdf(entries: CatalogAuditEntry[]) {
  const generatedAt = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date())

  const rows = entries.map((entry) => {
    const estado = entry.estado_nuevo || entry.estado_anterior
    
    const titulo = estado && typeof estado === 'object' && 'titulo' in estado 
      ? String((estado as any).titulo) 
      : entry.entidad_id.substring(0, 8) + '...'

    let cambiosHtml = ''
    if (estado && typeof estado === 'object') {
      const camposImportantes = ['titulo', 'sinopsis', 'duracion_minutos', 'fecha_lanzamiento', 'idioma', 'tipo']
      const camposMostrados = Object.entries(estado)
        .filter(([key]) => camposImportantes.includes(key))
        .slice(0, 5)
      
      if (camposMostrados.length > 0) {
        cambiosHtml = camposMostrados.map(([key, value]) => {
          let displayValue = value
          if (typeof value === 'string' && value.length > 50) {
            displayValue = value.substring(0, 50) + '...'
          }
          if (key === 'duracion_minutos' && value) {
            displayValue = `${value} min`
          }
          return `<div style="display:flex; gap:4px; font-size:10px; padding:2px 0;">
            <span style="color:#6b7280; min-width:80px;">${escapeHtml(key)}:</span>
            <span style="color:#111827;">${escapeHtml(String(displayValue))}</span>
          </div>`
        }).join('')
      } else {
        cambiosHtml = `<div style="font-size:10px; color:#6b7280;">${Object.keys(estado).length} campos</div>`
      }
    }

    return `
      <tr>
        <td style="white-space:nowrap; font-size:11px;">${escapeHtml(formatDate(entry.fecha_evento))}</td>
        <td>
          <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:600; 
            ${entry.evento === 'insercion' ? 'background:#d1fae5; color:#065f46;' : ''}
            ${entry.evento === 'actualizacion' ? 'background:#fef3c7; color:#92400e;' : ''}
            ${entry.evento === 'eliminacion' ? 'background:#fee2e2; color:#991b1b;' : ''}">
            ${escapeHtml(formatEvent(entry.evento))}
          </span>
        </td>
        <td style="font-size:11px;">${escapeHtml(entry.tabla_origen)}</td>
        <td style="font-size:11px; font-weight:500;">${escapeHtml(titulo)}</td>
        <td style="min-width:200px;">
          ${cambiosHtml}
        </td>
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #111827;
            margin: 32px;
            background: #fff;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 24px;
            font-weight: 700;
          }
          .meta {
            margin-bottom: 22px;
            color: #6b7280;
            font-size: 12px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 22px;
          }
          .summary div {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 16px;
            background: #f9fafb;
          }
          .summary strong {
            display: block;
            font-size: 22px;
            margin-top: 4px;
            color: #111827;
          }
          .summary .label {
            font-size: 12px;
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #f3f4f6;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
            color: #6b7280;
            padding: 10px 12px;
            text-align: left;
            border: 1px solid #e5e7eb;
          }
          td {
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background: #fafafa;
          }
          @media print {
            body { margin: 15mm; }
            .no-print { display: none; }
            tr:nth-child(even) td { background: #fafafa; }
          }
        </style>
      </head>
      <body>
        <h1>Auditoria de catálogo</h1>
        <div class="meta">Generado: ${escapeHtml(generatedAt)}</div>
        <section class="summary">
          <div>
            <span class="label">Eventos</span>
            <strong>${entries.length}</strong>
          </div>
          <div>
            <span class="label">Inserciones</span>
            <strong>${entries.filter((entry) => entry.evento === 'insercion').length}</strong>
          </div>
          <div>
            <span class="label">Actualizaciones</span>
            <strong>${entries.filter((entry) => entry.evento === 'actualizacion').length}</strong>
          </div>
          <div>
            <span class="label">Eliminaciones</span>
            <strong>${entries.filter((entry) => entry.evento === 'eliminacion').length}</strong>
          </div>
        </section>
        <table>
          <thead>
            <tr>
              <th style="width:15%;">Fecha</th>
              <th style="width:12%;">Evento</th>
              <th style="width:10%;">Tabla</th>
              <th style="width:20%;">Entidad</th>
              <th style="width:43%;">Cambios</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer,width=1100,height=800')
  
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para generar el PDF.')
    return
  }
  
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 10000)
}

function getChangedKeys(entry: CatalogAuditEntry): string[] {
  if (!entry.estado_anterior || !entry.estado_nuevo) return []
  return Object.keys(entry.estado_nuevo).filter((key) => {
    return JSON.stringify(entry.estado_anterior?.[key]) !== JSON.stringify(entry.estado_nuevo?.[key])
  })
}

function getEntityDisplay(entry: CatalogAuditEntry): { icon: React.ReactNode; title: string; type: string } {
  const estado = entry.estado_nuevo || entry.estado_anterior
  
  if (estado && typeof estado === 'object') {
    const titulo = (estado as any).titulo
    const tipo = (estado as any).tipo
    
    if (titulo) {
      const isMovie = tipo === 'pelicula'
      return {
        icon: isMovie ? <Film size={14} className="text-[var(--color-denim-400)]" /> : <Tv size={14} className="text-[var(--color-denim-400)]" />,
        title: String(titulo),
        type: String(tipo || 'contenido')
      }
    }
  }
  
  return {
    icon: <Info size={14} className="text-[var(--color-denim-500)]" />,
    title: entry.entidad_id ? entry.entidad_id.substring(0, 8) + '...' : 'Desconocido',
    type: 'desconocido'
  }
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return `[${value.length} elementos]`
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[Objeto]'
    }
  }
  return String(value)
}

export function AdminAuditPage() {
  const session = getActiveSession()
  const [entries, setEntries] = useState<CatalogAuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<CatalogAuditEntry | null>(null)

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

  // Filtrar eventos para mostrar solo inserciones y actualizaciones manuales
  const filteredEntries = useMemo(() => {
    // Separar eliminaciones (siempre se muestran)
    const deletions = entries.filter(entry => entry.evento === 'eliminacion')
    const nonDeletions = entries.filter(entry => entry.evento !== 'eliminacion')
    
    // Agrupar eventos no-eliminación por entidad
    const groupedByEntity: Record<string, CatalogAuditEntry[]> = {}
    
    nonDeletions.forEach(entry => {
      if (!groupedByEntity[entry.entidad_id]) {
        groupedByEntity[entry.entidad_id] = []
      }
      groupedByEntity[entry.entidad_id].push(entry)
    })

    const result: CatalogAuditEntry[] = []

    // Procesar inserciones y actualizaciones
    Object.values(groupedByEntity).forEach(entityEntries => {
      const sorted = [...entityEntries].sort((a, b) => 
        new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime()
      )

      let lastEventTime = 0
      let lastEventType = ''

      sorted.forEach((entry) => {
        const currentTime = new Date(entry.fecha_evento).getTime()
        
        if (entry.evento === 'insercion') {
          result.push(entry)
          lastEventTime = currentTime
          lastEventType = entry.evento
          return
        }

        if (entry.evento === 'actualizacion') {
          const timeDiff = currentTime - lastEventTime
          
          if (lastEventType === 'insercion' && timeDiff > 1000) {
            result.push(entry)
            lastEventTime = currentTime
            lastEventType = entry.evento
          } else if (lastEventType === 'actualizacion' && timeDiff > 2000) {
            result.push(entry)
            lastEventTime = currentTime
            lastEventType = entry.evento
          } else if (lastEventTime === 0) {
            result.push(entry)
            lastEventTime = currentTime
            lastEventType = entry.evento
          }
        }
      })
    })

    // Agregar todas las eliminaciones
    deletions.forEach(entry => {
      result.push(entry)
    })

    // Ordenar por fecha descendente
    return result.sort((a, b) => 
      new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime()
    )
  }, [entries])

  const stats = useMemo(() => {
    return {
      total: filteredEntries.length,
      inserts: filteredEntries.filter((entry) => entry.evento === 'insercion').length,
      updates: filteredEntries.filter((entry) => entry.evento === 'actualizacion').length,
      deletes: filteredEntries.filter((entry) => entry.evento === 'eliminacion').length,
    }
  }, [filteredEntries])

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
            <Button onClick={() => downloadExcel(filteredEntries)} disabled={filteredEntries.length === 0}>
              <Download size={15} />
              Descargar CSV
            </Button>
            <Button variant="outline" onClick={() => printPdf(filteredEntries)} disabled={filteredEntries.length === 0}>
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
        ) : filteredEntries.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-500)]">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredEntries.map((entry) => {
                  const changedKeys = getChangedKeys(entry)
                  const entityInfo = getEntityDisplay(entry)
                  const estadoActual = entry.estado_nuevo || entry.estado_anterior
                  
                  return (
                    <tr 
                      key={entry.id} 
                      className="align-top hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--color-denim-200)]">
                        {formatDate(entry.fecha_evento)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getEventClasses(entry.evento)}`}>
                          {formatEvent(entry.evento)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white">{entry.tabla_origen}</td>
                      <td className="max-w-[200px] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-denim-400)]">
                            {entityInfo.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium truncate">
                              {entityInfo.title}
                            </div>
                            <div className="text-[10px] text-[var(--color-denim-500)]">
                              {entityInfo.type} • {entry.entidad_id ? entry.entidad_id.substring(0, 8) : ''}...
                            </div>
                          </div>
                        </div>
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
                          <div className="space-y-1 text-xs">
                            {estadoActual && typeof estadoActual === 'object' && 
                              Object.entries(estadoActual).slice(0, 4).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-[var(--color-denim-500)] min-w-[70px] font-medium">{key}:</span>
                                  <span className="text-white truncate max-w-[200px]">
                                    {formatChangeValue(value)}
                                  </span>
                                </div>
                              ))}
                            {estadoActual && typeof estadoActual === 'object' && Object.keys(estadoActual).length > 4 && (
                              <div className="text-[var(--color-denim-500)] text-xs mt-1">
                                + {Object.keys(estadoActual).length - 4} campos más
                              </div>
                            )}
                          </div>
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

      {/* Modal para ver detalle completo */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-[#0a0f1c] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto border border-white/[0.07]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Detalle del Cambio</h3>
              <button onClick={() => setSelectedEntry(null)} className="text-[var(--color-denim-400)] hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-[var(--color-denim-500)] min-w-[80px]">Evento:</span>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getEventClasses(selectedEntry.evento)}`}>
                  {formatEvent(selectedEntry.evento)}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-denim-500)] min-w-[80px]">Tabla:</span>
                <span className="text-white">{selectedEntry.tabla_origen}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-denim-500)] min-w-[80px]">Entidad:</span>
                <span className="text-white font-mono text-xs">{selectedEntry.entidad_id}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-denim-500)] min-w-[80px]">Fecha:</span>
                <span className="text-white">{formatDate(selectedEntry.fecha_evento)}</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-[var(--color-denim-300)] mb-2">Datos del contenido:</h4>
              <div className="bg-[#080c14] p-4 rounded-lg space-y-1.5">
                {(selectedEntry.estado_nuevo || selectedEntry.estado_anterior) && 
                  Object.entries(selectedEntry.estado_nuevo || selectedEntry.estado_anterior || {}).map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-sm">
                      <span className="text-[var(--color-denim-500)] min-w-[100px] font-medium">{key}:</span>
                      <span className="text-white break-all">
                        {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}