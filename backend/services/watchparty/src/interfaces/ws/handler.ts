import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import {
  obtenerSalaPorCodigo,
  obtenerSalaPorId,
  agregarParticipante,
  obtenerParticipantes,
  actualizarEstadoSala,
  marcarDesconectado,
  obtenerParticipante,
  actualizarLatido,
} from '../../infrastructure/room-repository'
import {
  SalaWatchParty,
  Participante,
  WsMessage,
  ServerWsMessage,
} from '../../domain/room'

interface ClientInfo {
  ws: WebSocket
  salaId: string
  perfilId: string
  perfilNombre: string
  cuentaId: string
  participanteId: string
}

const clients = new Map<string, ClientInfo>()        // perfilId → info
const roomClients = new Map<string, Set<string>>()    // salaId → Set<perfilId>

function broadcastToRoom(salaId: string, message: ServerWsMessage, excludePerfil?: string): void {
  const members = roomClients.get(salaId)
  if (!members) return
  const data = JSON.stringify(message)
  for (const perfilId of members) {
    const client = clients.get(perfilId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      if (perfilId !== excludePerfil) {
        client.ws.send(data)
      }
    }
  }
}

function sendTo(ws: WebSocket, message: ServerWsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

async function handleJoin(
  ws: WebSocket,
  codigo: string,
  perfilId: string,
  perfilNombre: string,
  cuentaId: string,
): Promise<void> {
  if (clients.has(perfilId)) {
    const existing = clients.get(perfilId)!
    if (existing.ws.readyState === WebSocket.OPEN) {
      existing.ws.close(4000, 'Reemplazado por nueva conexión')
    }
    clients.delete(perfilId)
  }

  const sala = await obtenerSalaPorCodigo(codigo)
  if (!sala) {
    sendTo(ws, { type: 'error', message: 'Código de sala inválido o sala finalizada.' })
    ws.close()
    return
  }

  const existingParticipant = await obtenerParticipante(sala.id, perfilId)
  const esAnfitrion = sala.creadorPerfilId === perfilId

  let participante: Participante
  if (existingParticipant) {
    participante = existingParticipant
  } else {
    participante = await agregarParticipante(sala.id, perfilId, perfilNombre, cuentaId, esAnfitrion)
  }

  const info: ClientInfo = { ws, salaId: sala.id, perfilId, perfilNombre, cuentaId, participanteId: participante.id }
  clients.set(perfilId, info)

  if (!roomClients.has(sala.id)) {
    roomClients.set(sala.id, new Set())
  }
  roomClients.get(sala.id)!.add(perfilId)

  const participantes = await obtenerParticipantes(sala.id)

  sendTo(ws, {
    type: 'joined',
    sala,
    participantes,
  })

  broadcastToRoom(sala.id, {
    type: 'participant_joined',
    participant: participante,
  }, perfilId)
}

export function setupWebSocket(server: http.Server): void {
  const wss = new WebSocketServer({ server, path: '/api/v1/watch-party/ws' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const codigo = url.searchParams.get('codigo') ?? ''
    const perfilId = url.searchParams.get('perfil_id') ?? ''
    const perfilNombre = url.searchParams.get('perfil_nombre') ?? ''
    const cuentaId = url.searchParams.get('cuenta_id') ?? ''

    if (!codigo || !perfilId) {
      sendTo(ws, { type: 'error', message: 'Faltan parámetros: codigo y perfil_id son requeridos.' })
      ws.close()
      return
    }

    void handleJoin(ws, codigo, perfilId, perfilNombre, cuentaId)

    ws.on('message', async (raw) => {
      let msg: WsMessage
      try {
        msg = JSON.parse(raw.toString()) as WsMessage
      } catch {
        sendTo(ws, { type: 'error', message: 'Mensaje JSON inválido.' })
        return
      }

      const info = clients.get(perfilId)
      if (!info) return

      switch (msg.type) {
        case 'play':
        case 'pause': {
          const newEstado = msg.type === 'play' ? 'reproduciendo' : 'pausada'
          await actualizarEstadoSala(info.salaId, newEstado, msg.position ?? 0)
          broadcastToRoom(info.salaId, {
            type: msg.type,
            position: msg.position ?? 0,
            triggered_by: perfilId,
          })
          break
        }
        case 'seek': {
          await actualizarEstadoSala(info.salaId, 'pausada', msg.position ?? 0)
          broadcastToRoom(info.salaId, {
            type: 'seek',
            position: msg.position ?? 0,
            triggered_by: perfilId,
          })
          break
        }
        case 'sync_request': {
          const sala = await obtenerSalaPorId(info.salaId)
          if (sala) {
            sendTo(ws, {
              type: 'state_sync',
              estado_reproduccion: sala.estadoReproduccion,
              position: sala.posicionSegundos,
            })
          }
          break
        }
        case 'ping': {
          await actualizarLatido(info.participanteId)
          sendTo(ws, { type: 'pong' })
          break
        }
      }
    })

    ws.on('close', async () => {
      const info = clients.get(perfilId)
      if (info) {
        clients.delete(perfilId)
        const roomSet = roomClients.get(info.salaId)
        if (roomSet) {
          roomSet.delete(perfilId)
          if (roomSet.size === 0) {
            roomClients.delete(info.salaId)
          }
        }
        await marcarDesconectado(perfilId, info.salaId)
        broadcastToRoom(info.salaId, {
          type: 'participant_left',
          perfil_id: perfilId,
        })
      }
    })

    // Ping/pong keepalive interval
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
      } else {
        clearInterval(interval)
      }
    }, 30000)
  })
}
