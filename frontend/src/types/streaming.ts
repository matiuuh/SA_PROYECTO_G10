export interface PlaybackProgress {
  id: string
  perfil_id: string
  contenido_id: string
  episodio_id: string
  estado: 'en_progreso' | 'finalizado' | string
  progreso_segundos: number
  actualizado_en: string
}

export interface PlaybackHistoryResponse {
  historial: PlaybackProgress[]
}

export interface RecommendationContent {
  id: string
  titulo: string
  tipo: string
  sinopsis: string
  idioma: string
  url_portada: string
  fecha_lanzamiento?: string
  porcentaje_recomendacion: number
  url_trailer: string
  puntaje: number
  motivo: string
}

export interface RecommendationsResponse {
  algoritmo: string
  titulo_seccion: string
  recomendaciones: RecommendationContent[]
}

export interface UpdatePlaybackProgressPayload {
  perfil_id: string
  contenido_id: string
  episodio_id?: string
  progreso_segundos: number
  duracion_total_segundos: number
}
