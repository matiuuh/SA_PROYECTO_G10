export interface SalaWatchParty {
  id: string
  creadorPerfilId: string
  creadorCuentaId: string
  contenidoId: string
  tipoContenido: 'pelicula' | 'serie'
  codigoInvite: string
  estado: 'activa' | 'finalizada'
  estadoReproduccion: 'reproduciendo' | 'pausada' | 'finalizada'
  posicionSegundos: number
  duracionSegundos: number
  creadoEn: Date
  actualizadoEn: Date
}

export interface Participante {
  id: string
  salaId: string
  perfilId: string
  perfilNombre: string
  cuentaId: string
  esAnfitrion: boolean
  conectado: boolean
  ultimoLatido: Date
  creadoEn: Date
}

export type WsMessageType =
  | 'join'
  | 'play'
  | 'pause'
  | 'seek'
  | 'sync_request'
  | 'ping'

export type ServerWsMessageType =
  | 'joined'
  | 'participant_joined'
  | 'participant_left'
  | 'play'
  | 'pause'
  | 'seek'
  | 'state_sync'
  | 'error'
  | 'pong'

export interface WsMessage {
  type: WsMessageType
  position?: number
  codigo?: string
  perfil_id?: string
  perfil_nombre?: string
  cuenta_id?: string
}

export interface ServerWsMessage {
  type: ServerWsMessageType
  sala?: SalaWatchParty
  participantes?: Participante[]
  participant?: Participante
  perfil_id?: string
  position?: number
  triggered_by?: string
  estado_reproduccion?: string
  message?: string
}
