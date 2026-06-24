import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getStoredActiveProfile, getActiveSession } from '@/lib/auth'
import { unirsePorCodigo, getWebSocketUrl } from '@/lib/watchparty-api'
import type { SalaWatchParty, Participante } from '@/lib/watchparty-api'

type SyncState = 'idle' | 'joining' | 'joined'

interface ServerWsMessage {
  type: string
  sala?: SalaWatchParty
  participantes?: Participante[]
  participant?: Participante
  perfil_id?: string
  position?: number
  triggered_by?: string
  estado_reproduccion?: string
  message?: string
}

export function WatchPartyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [codigoInput, setCodigoInput] = useState('')
  const [sala, setSala] = useState<SalaWatchParty | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const profile = getStoredActiveProfile()
  const session = getActiveSession()

  useEffect(() => {
    const code = searchParams.get('codigo')
    if (code) {
      setCodigoInput(code)
      handleJoin(code)
    }
  }, [searchParams])

  function conectarWebSocket(room: SalaWatchParty) {
    if (!profile || !session) return
    const url = getWebSocketUrl(room, profile.id, profile.nombre, session.account.id)

    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setSyncState('joined')
      setError('')
    }

    ws.onmessage = (event) => {
      const msg: ServerWsMessage = JSON.parse(event.data)

      switch (msg.type) {
        case 'joined':
          if (msg.sala) setSala(msg.sala)
          if (msg.participantes) setParticipantes(msg.participantes)
          break
        case 'participant_joined':
          if (msg.participant) {
            setParticipantes((prev) => [...prev.filter((p) => p.perfilId !== msg.participant!.perfilId), msg.participant!])
          }
          break
        case 'participant_left':
          if (msg.perfil_id) {
            setParticipantes((prev) => prev.filter((p) => p.perfilId !== msg.perfil_id))
          }
          break
        case 'error':
          setError(msg.message ?? 'Error en la sala')
          break
      }
    }

    ws.onerror = () => {
      setError('Error de conexion WebSocket')
    }

    ws.onclose = () => {
      if (syncState === 'joined') {
        setError('Conexion perdida. Reconnecting...')
        setTimeout(() => conectarWebSocket(room), 3000)
      }
    }

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)

    wsRef.current = ws
    return () => {
      clearInterval(pingInterval)
      ws.close()
    }
  }

  async function handleJoin(code?: string) {
    const codigo = (code ?? codigoInput).trim().toUpperCase()
    if (!codigo) return

    setError('')
    setSyncState('joining')

    try {
      const room = await unirsePorCodigo(codigo)
      setSala(room)
      conectarWebSocket(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse a la sala')
      setSyncState('idle')
    }
  }

  function handleCopyLink() {
    if (!sala) return
    const link = `${window.location.origin}/watch-party?codigo=${sala.codigoInvite}`
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (!profile || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] text-white">
        <p>Debes iniciar sesion y seleccionar un perfil.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-bold">Watch Party</h1>

        {!sala && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="mb-4 text-lg font-semibold">Unirse a una sala</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                  placeholder="Ingresa el codigo de invitacion"
                  maxLength={10}
                  className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={() => handleJoin()}
                  disabled={syncState === 'joining' || !codigoInput.trim()}
                  className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {syncState === 'joining' ? 'Uniendo...' : 'Unirse'}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        )}

        {syncState === 'joined' && sala && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="mb-2 text-lg font-semibold">Sala activa</h2>
              <p className="text-sm text-[var(--color-denim-300)]">
                Codigo de invitacion: <span className="font-mono font-bold text-white">{sala.codigoInvite}</span>
              </p>
              <button
                onClick={handleCopyLink}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
              >
                {copiado ? 'Copiado!' : 'Copiar link de invitacion'}
              </button>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-denim-200)]">
                Participantes ({participantes.length})
              </h3>
              <ul className="space-y-2">
                {participantes.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${p.conectado ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span>{p.perfilNombre}</span>
                    {p.esAnfitrion && (
                      <span className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                        Anfitrion
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              onClick={() => navigate(-1)}
              className="text-sm text-[var(--color-denim-400)] hover:text-white"
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
