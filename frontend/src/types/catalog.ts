export interface CatalogContent {
  id: string
  titulo: string
  tipo: string
  sinopsis: string
  idioma: string
  url_portada: string
  fecha_lanzamiento?: string
  porcentaje_recomendacion: number
  url_trailer: string
}

export interface CatalogListResponse {
  contenidos: CatalogContent[]
}

export interface CatalogDetail {
  id: string
  titulo: string
  tipo: string
  sinopsis: string
  ficha_tecnica: string
  fecha_lanzamiento?: string
  clasificacion_edad: string
  duracion_minutos: number | null
  idioma: string
  url_portada: string
  url_trailer: string
  total_likes: number
  total_dislikes: number
  porcentaje_recomendacion: number
  generos: Array<{
    id: number
    nombre: string
    descripcion: string
  }>
  reparto: Array<{
    id: number
    nombre_artistico: string
    nombre_real: string
    nacionalidad: string
    personaje: string
  }>
}

export interface CatalogDetailResponse {
  detalle: CatalogDetail
}

export interface LikeCatalogContentResponse {
  message: string
  total_likes: number
  total_dislikes: number
  porcentaje_recomendacion: number
}

export interface CreateCatalogContentPayload {
  titulo: string
  tipo: 'pelicula' | 'serie'
  sinopsis: string
  ficha_tecnica: string
  fecha_lanzamiento?: string
  clasificacion_edad?: string
  duracion_minutos?: number
  idioma: string
  url_portada: string
  url_trailer?: string
}

export interface CreateCatalogContentResponse {
  id: string
  message: string
}
