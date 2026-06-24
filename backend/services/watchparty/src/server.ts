import http from 'http'
import { createPool, closePool } from './infrastructure/postgres'
import { createHttpRouter } from './interfaces/http/handler'
import { setupWebSocket } from './interfaces/ws/handler'

async function main(): Promise<void> {
  createPool()
  console.log('[watchparty] conexion a postgres establecida')

  const httpPort = parseInt(process.env['HTTP_PORT'] ?? '8008')

  const httpHandler = createHttpRouter()
  const server = http.createServer(httpHandler)

  setupWebSocket(server)

  await new Promise<void>((resolve, reject) => {
    server.listen(httpPort, '0.0.0.0', () => {
      console.log(`[watchparty] HTTP + WebSocket escuchando en puerto ${httpPort}`)
      resolve()
    })
    server.on('error', reject)
  })

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[watchparty] Señal ${signal} recibida — apagando...`)
    await closePool()
    console.log('[watchparty] Apagado limpio completado')
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((err: Error) => {
  console.error('[watchparty] Error fatal:', err.message)
  process.exit(1)
})
