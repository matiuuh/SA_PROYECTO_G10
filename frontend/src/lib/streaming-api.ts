import type {
  PlaybackProgress,
  PlaybackHistoryResponse,
  UpdatePlaybackProgressPayload,
} from '@/types/streaming'
import { getActiveSession } from '@/lib/auth'

const API_BASE_URL = import.meta.env.VITE_STREAMING_API_URL ?? 'http://localhost:8004'

function authHeaders(): Record<string, string> {
  const session = getActiveSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.accessToken}` }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    // Ignore parse errors and use fallback.
  }

  return 'No se pudo procesar la reproduccion.'
}

export async function getPlaybackProgress(
  perfilId: string,
  contenidoId: string,
  episodioId = '',
): Promise<PlaybackProgress | null> {
  const params = new URLSearchParams({
    perfil_id: perfilId,
    contenido_id: contenidoId,
  })

  if (episodioId) {
    params.set('episodio_id', episodioId)
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/progress?${params.toString()}`, {
    headers: { ...authHeaders() },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as PlaybackProgress
}

export async function updatePlaybackProgress(
  payload: UpdatePlaybackProgressPayload,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function getTrailerSignedUrl(contenidoId: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/trailer/${encodeURIComponent(contenidoId)}`, {
    headers: { ...authHeaders() },
  })

  if (response.status === 404) return null
  if (!response.ok) return null

  const data = (await response.json()) as { url?: string }
  return data.url ?? null
}

export async function getEpisodeSignedUrl(objectName: string): Promise<string | null> {
  const encoded = objectName.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${API_BASE_URL}/api/v1/episode/${encoded}`, {
    headers: { ...authHeaders() },
  })

  if (response.status === 404) return null
  if (!response.ok) return null

  const data = (await response.json()) as { url?: string }
  return data.url ?? null
}

export async function getPlaybackHistory(
  perfilId: string,
  limit = 10,
): Promise<PlaybackProgress[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/history/${perfilId}?limit=${limit}`, {
    headers: { ...authHeaders() },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as PlaybackHistoryResponse
  return data.historial
}
