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

export interface UpdatePlaybackProgressPayload {
  perfil_id: string
  contenido_id: string
  episodio_id?: string
  progreso_segundos: number
  duracion_total_segundos: number
}
