import http from 'http'
import {
  crearSala,
  obtenerSalaPorId,
  obtenerSalaPorCodigo,
  cerrarSala,
} from '../../infrastructure/room-repository'

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {})
      } catch {
        reject(new Error('JSON inválido'))
      }
    })
    req.on('error', reject)
  })
}

function parseUrl(url: string): { pathname: string; searchParams: URLSearchParams } {
  const u = new URL(url, 'http://x')
  return { pathname: u.pathname, searchParams: u.searchParams }
}

async function checkPremium(cuentaId: string): Promise<boolean> {
  const suscripcionUrl = process.env['SUSCRIPCION_SERVICE_URL'] ?? 'http://suscripcion:8002'
  try {
    const res = await fetch(`${suscripcionUrl}/api/v1/internal/subscriptions/account/${cuentaId}/status`)
    if (!res.ok) return false
    const data = await res.json() as { suscripcion?: { plan_id?: string } }
    // Premium plan UUID from seed: b0000000-...-003
    const premiumId = 'b0000000-0000-0000-0000-000000000003'
    return data.suscripcion?.plan_id === premiumId
  } catch {
    return false
  }
}

export function createHttpRouter(): http.RequestListener {
  return async (req, res) => {
    const { pathname, searchParams } = parseUrl(req.url ?? '/')
    const method = req.method ?? 'GET'

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      })
      res.end()
      return
    }

    if (method === 'GET' && pathname === '/health') {
      writeJson(res, 200, { status: 'ok' })
      return
    }

    // POST /api/v1/watch-party — Crear sala (requiere Premium)
    if (method === 'POST' && pathname === '/api/v1/watch-party') {
      try {
        const body = await readBody(req)
        const cuentaId = String(body['cuenta_id'] ?? '')
        if (!cuentaId) {
          writeJson(res, 400, { error: 'cuenta_id es requerido' })
          return
        }

        const esPremium = await checkPremium(cuentaId)
        if (!esPremium) {
          writeJson(res, 403, { error: 'Solo usuarios con plan Premium pueden crear Watch Parties.' })
          return
        }

        const sala = await crearSala(
          String(body['perfil_id'] ?? ''),
          cuentaId,
          String(body['contenido_id'] ?? ''),
          String(body['tipo_contenido'] ?? 'pelicula'),
          Number(body['duracion_segundos'] ?? 0),
        )
        writeJson(res, 201, { sala })
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message })
      }
      return
    }

    // GET /api/v1/watch-party/:id — Info de sala
    if (method === 'GET' && /^\/api\/v1\/watch-party\/([^/]+)$/.test(pathname)) {
      try {
        const id = pathname.split('/').pop()!
        const sala = await obtenerSalaPorId(id)
        if (!sala) {
          writeJson(res, 404, { error: 'Sala no encontrada o ya finalizada.' })
          return
        }
        writeJson(res, 200, { sala })
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message })
      }
      return
    }

    // GET /api/v1/watch-party/join/:codigo — Unirse por código
    if (method === 'GET' && /^\/api\/v1\/watch-party\/join\/([^/]+)$/.test(pathname)) {
      try {
        const codigo = pathname.split('/').pop()!
        const sala = await obtenerSalaPorCodigo(codigo)
        if (!sala) {
          writeJson(res, 404, { error: 'Código inválido o sala finalizada.' })
          return
        }
        writeJson(res, 200, { sala })
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message })
      }
      return
    }

    // DELETE /api/v1/watch-party/:id — Cerrar sala
    if (method === 'DELETE' && /^\/api\/v1\/watch-party\/([^/]+)$/.test(pathname)) {
      try {
        const id = pathname.split('/').pop()!
        await cerrarSala(id)
        writeJson(res, 200, { ok: true })
      } catch (err) {
        writeJson(res, 500, { error: (err as Error).message })
      }
      return
    }

    writeJson(res, 404, { error: 'Ruta no encontrada' })
  }
}
