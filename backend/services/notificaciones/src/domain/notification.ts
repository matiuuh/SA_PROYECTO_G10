export type TipoNotificacion =
  | 'confirmacion_registro'
  | 'recibo'
  | 'alerta_publicacion';

export type EstadoNotificacion = 'pendiente' | 'enviado' | 'fallido';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  correo_destino: string;
  asunto: string;
  estado: EstadoNotificacion;
  intentos: number;
  error_mensaje: string | null;
  creado_en: Date;
  enviado_en: Date | null;
}
