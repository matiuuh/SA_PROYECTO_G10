import { getActiveSession } from './auth'

const API_BASE_URL = import.meta.env.VITE_STREAMING_API_URL ?? 'http://localhost:8004'

export interface SalaWatchParty {
  id: string
  creadorPerfilId: string
  creadorCuentaId: string
  contenidoId: string
  tipoContenido: string
  codigoInvite: string
  estado: string
  estadoReproduccion: string
  posicionSegundos: number
  duracionSegundos: number
  creadoEn: string
  actualizadoEn: string
}

export interface Participante {
  id: string
  salaId: string
  perfilId: string
  perfilNombre: string
  cuentaId: string
  esAnfitrion: boolean
  conectado: boolean
}

interface CreateSalaPayload {
  perfil_id: string
  cuenta_id: string
  contenido_id: string
  tipo_contenido: string
  duracion_segundos: number
}

function authHeaders(): Record<string, string> {
  const session = getActiveSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.accessToken}` }
}

export async function createSala(payload: CreateSalaPayload): Promise<SalaWatchParty> {
  const res = await fetch(`${API_BASE_URL}/api/v1/watch-party`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error al crear sala' }))
    throw new Error(err.error ?? 'Error al crear sala')
  }
  const data = await res.json() as { sala: SalaWatchParty }
  return data.sala
}

export async function obtenerSala(id: string): Promise<SalaWatchParty> {
  const res = await fetch(`${API_BASE_URL}/api/v1/watch-party/${id}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sala no encontrada' }))
    throw new Error(err.error ?? 'Sala no encontrada')
  }
  const data = await res.json() as { sala: SalaWatchParty }
  return data.sala
}

export async function unirsePorCodigo(codigo: string): Promise<SalaWatchParty> {
  const res = await fetch(`${API_BASE_URL}/api/v1/watch-party/join/${codigo}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Codigo invalido' }))
    throw new Error(err.error ?? 'Codigo invalido')
  }
  const data = await res.json() as { sala: SalaWatchParty }
  return data.sala
}

export function getWebSocketUrl(sala: SalaWatchParty, perfilId: string, perfilNombre: string, cuentaId: string): string {
  const fullBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL
    : `${window.location.origin}${API_BASE_URL}`
  const wsBase = fullBase.replace(/^http/, 'ws')
  return `${wsBase}/api/v1/watch-party/ws?codigo=${sala.codigoInvite}&perfil_id=${perfilId}&perfil_nombre=${encodeURIComponent(perfilNombre)}&cuenta_id=${cuentaId}`
}
