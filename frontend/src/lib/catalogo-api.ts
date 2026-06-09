import type {
  CatalogContent,
  CatalogDetail,
  CatalogDetailResponse,
  CatalogListResponse,
  CreateCatalogContentPayload,
  CreateCatalogContentResponse,
  LikeCatalogContentResponse,
} from '@/types/catalog'

const API_BASE_URL = import.meta.env.VITE_CATALOGO_API_URL ?? 'http://localhost:8003'

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string }
    if (typeof data.detail === 'string') return data.detail
  } catch {
    // Ignore parse errors and use fallback.
  }

  return 'No se pudo cargar el catalogo.'
}

export async function listCatalogContent(): Promise<CatalogContent[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as CatalogListResponse
  return data.contenidos
}

export async function searchCatalogContent(query: string): Promise<CatalogContent[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/search?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as CatalogListResponse
  return data.contenidos
}

export async function getCatalogDetail(contentId: string): Promise<CatalogDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/${contentId}`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as CatalogDetailResponse
  return {
    ...data.detalle,
    ficha_tecnica: data.detalle.ficha_tecnica ?? '',
    clasificacion_edad: data.detalle.clasificacion_edad ?? '',
    idioma: data.detalle.idioma ?? '',
    url_portada: data.detalle.url_portada ?? '',
    url_trailer: data.detalle.url_trailer ?? '',
    total_likes: data.detalle.total_likes ?? 0,
    total_dislikes: data.detalle.total_dislikes ?? 0,
    porcentaje_recomendacion: data.detalle.porcentaje_recomendacion ?? 0,
    generos: data.detalle.generos ?? [],
    reparto: data.detalle.reparto ?? [],
  }
}

export async function createCatalogContent(
  accessToken: string,
  payload: CreateCatalogContentPayload,
): Promise<CreateCatalogContentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/catalog/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as CreateCatalogContentResponse
}

export async function likeCatalogContent(
  accessToken: string,
  contentId: string,
  perfilId: string,
): Promise<LikeCatalogContentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/catalog/${contentId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      perfil_id: perfilId,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as LikeCatalogContentResponse
}
