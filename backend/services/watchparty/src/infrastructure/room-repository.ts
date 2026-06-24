import { query } from '../infrastructure/postgres'
import { SalaWatchParty, Participante } from '../domain/room'

export async function crearSala(
  creadorPerfilId: string,
  creadorCuentaId: string,
  contenidoId: string,
  tipoContenido: string,
  duracionSegundos: number,
): Promise<SalaWatchParty> {
  const result = await query(
    `INSERT INTO salas_watch_party
       (creador_perfil_id, creador_cuenta_id, contenido_id, tipo_contenido,
        codigo_invite, duracion_segundos)
     VALUES ($1, $2, $3, $4, fn_generar_codigo_invite(), $5)
     RETURNING *`,
    [creadorPerfilId, creadorCuentaId, contenidoId, tipoContenido, duracionSegundos],
  )
  return mapSala(result.rows[0])
}

export async function obtenerSalaPorId(id: string): Promise<SalaWatchParty | null> {
  const result = await query(
    'SELECT * FROM salas_watch_party WHERE id = $1 AND estado = $2',
    [id, 'activa'],
  )
  return result.rows.length ? mapSala(result.rows[0]) : null
}

export async function obtenerSalaPorCodigo(codigo: string): Promise<SalaWatchParty | null> {
  const result = await query(
    'SELECT * FROM salas_watch_party WHERE codigo_invite = $1 AND estado = $2',
    [codigo.toUpperCase(), 'activa'],
  )
  return result.rows.length ? mapSala(result.rows[0]) : null
}

export async function actualizarEstadoSala(
  id: string,
  estadoReproduccion: string,
  posicionSegundos: number,
): Promise<void> {
  await query(
    `UPDATE salas_watch_party
     SET estado_reproduccion = $2,
         posicion_segundos = $3,
         actualizado_en = NOW()
     WHERE id = $1`,
    [id, estadoReproduccion, posicionSegundos],
  )
}

export async function cerrarSala(id: string): Promise<void> {
  await query(
    `UPDATE salas_watch_party
     SET estado = 'finalizada',
         actualizado_en = NOW()
     WHERE id = $1`,
    [id],
  )
}

export async function agregarParticipante(
  salaId: string,
  perfilId: string,
  perfilNombre: string,
  cuentaId: string,
  esAnfitrion: boolean,
): Promise<Participante> {
  const result = await query(
    `INSERT INTO participantes_watch_party
       (sala_id, perfil_id, perfil_nombre, cuenta_id, es_anfitrion)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [salaId, perfilId, perfilNombre, cuentaId, esAnfitrion],
  )
  return mapParticipante(result.rows[0])
}

export async function obtenerParticipantes(salaId: string): Promise<Participante[]> {
  const result = await query(
    'SELECT * FROM participantes_watch_party WHERE sala_id = $1 ORDER BY es_anfitrion DESC, creado_en ASC',
    [salaId],
  )
  return result.rows.map(mapParticipante)
}

export async function actualizarLatido(participanteId: string): Promise<void> {
  await query(
    'UPDATE participantes_watch_party SET ultimo_latido = NOW() WHERE id = $1',
    [participanteId],
  )
}

export async function marcarDesconectado(perfilId: string, salaId: string): Promise<void> {
  await query(
    `UPDATE participantes_watch_party
     SET conectado = FALSE,
         ultimo_latido = NOW()
     WHERE perfil_id = $1 AND sala_id = $2`,
    [perfilId, salaId],
  )
}

export async function obtenerParticipante(
  salaId: string,
  perfilId: string,
): Promise<Participante | null> {
  const result = await query(
    'SELECT * FROM participantes_watch_party WHERE sala_id = $1 AND perfil_id = $2',
    [salaId, perfilId],
  )
  return result.rows.length ? mapParticipante(result.rows[0]) : null
}

function mapSala(row: Record<string, unknown>): SalaWatchParty {
  return {
    id: row['id'] as string,
    creadorPerfilId: row['creador_perfil_id'] as string,
    creadorCuentaId: row['creador_cuenta_id'] as string,
    contenidoId: row['contenido_id'] as string,
    tipoContenido: row['tipo_contenido'] as 'pelicula' | 'serie',
    codigoInvite: row['codigo_invite'] as string,
    estado: row['estado'] as 'activa' | 'finalizada',
    estadoReproduccion: row['estado_reproduccion'] as 'reproduciendo' | 'pausada' | 'finalizada',
    posicionSegundos: Number(row['posicion_segundos']),
    duracionSegundos: Number(row['duracion_segundos']),
    creadoEn: row['creado_en'] as Date,
    actualizadoEn: row['actualizado_en'] as Date,
  }
}

function mapParticipante(row: Record<string, unknown>): Participante {
  return {
    id: row['id'] as string,
    salaId: row['sala_id'] as string,
    perfilId: row['perfil_id'] as string,
    perfilNombre: row['perfil_nombre'] as string,
    cuentaId: row['cuenta_id'] as string,
    esAnfitrion: row['es_anfitrion'] as boolean,
    conectado: row['conectado'] as boolean,
    ultimoLatido: row['ultimo_latido'] as Date,
    creadoEn: row['creado_en'] as Date,
  }
}
