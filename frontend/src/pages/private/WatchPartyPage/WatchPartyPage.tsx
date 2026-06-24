import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Volume2, VolumeX } from 'lucide-react'
import { getStoredActiveProfile, getActiveSession } from '@/lib/auth'
import { unirsePorCodigo, getWebSocketUrl } from '@/lib/watchparty-api'
import { getTrailerSignedUrl } from '@/lib/streaming-api'
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
  perfil_nombre?: string
  text?: string
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [mensajesChat, setMensajesChat] = useState<Array<{ perfilId: string; perfilNombre: string; text: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const suppressNextSync = useRef(false)
  const chatRef = useRef<HTMLDivElement | null>(null)

  const profile = getStoredActiveProfile()
  const session = getActiveSession()
  const esAnfitrion = sala ? sala.creadorPerfilId === profile?.id : false

  useEffect(() => {
    const code = searchParams.get('codigo')
    if (code) {
      setCodigoInput(code)
      handleJoin(code)
    }
  }, [searchParams])

  async function cargarVideo(room: SalaWatchParty) {
    try {
      const url = await getTrailerSignedUrl(room.contenidoId)
      setVideoUrl(url)
    } catch {
      setError('No se pudo cargar el video')
    }
  }

  function conectarWebSocket(room: SalaWatchParty) {
    if (!profile || !session) return
    const url = getWebSocketUrl(room, profile.id, profile.nombre, session.account.id)

    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setSyncState('joined')
      setError('')
      void cargarVideo(room)
    }

    ws.onmessage = (event) => {
      const msg: ServerWsMessage = JSON.parse(event.data)

      switch (msg.type) {
        case 'joined':
          if (msg.sala) setSala(msg.sala)
          if (msg.participantes) setParticipantes(msg.participantes)
          break
        case 'participant_joined':
          if (msg.participant)
            setParticipantes((prev) => [...prev.filter((p) => p.perfilId !== msg.participant!.perfilId), msg.participant!])
          break
        case 'participant_left':
          if (msg.perfil_id)
            setParticipantes((prev) => prev.filter((p) => p.perfilId !== msg.perfil_id))
          break
        case 'play':
          if (msg.triggered_by !== profile?.id) {
            suppressNextSync.current = true
            const vid = videoRef.current
            if (vid) {
              vid.currentTime = msg.position ?? vid.currentTime
              void vid.play()
            }
          }
          break
        case 'pause':
          if (msg.triggered_by !== profile?.id) {
            suppressNextSync.current = true
            const vid = videoRef.current
            if (vid) {
              vid.pause()
              vid.currentTime = msg.position ?? vid.currentTime
            }
          }
          break
        case 'seek':
          if (msg.triggered_by !== profile?.id) {
            suppressNextSync.current = true
            const vid = videoRef.current
            if (vid) vid.currentTime = msg.position ?? 0
          }
          break
        case 'state_sync':
          suppressNextSync.current = true
          const vid3 = videoRef.current
          if (vid3) {
            vid3.currentTime = msg.position ?? 0
            if (msg.estado_reproduccion === 'reproduciendo') void vid3.play()
            else vid3.pause()
          }
          break
        case 'chat_message':
          if (msg.perfil_nombre && msg.text) {
            setMensajesChat((prev) => [...prev, { perfilId: msg.perfil_id ?? '', perfilNombre: msg.perfil_nombre ?? '', text: msg.text ?? '' }])
            setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 50)
          }
          break
        case 'error':
          setError(msg.message ?? 'Error en la sala')
          break
      }
    }

    ws.onerror = () => setError('Error de conexion WebSocket')

    ws.onclose = () => {
      if (syncState === 'joined') {
        setError('Conexion perdida. Reconnecting...')
        setTimeout(() => conectarWebSocket(room), 3000)
      }
    }

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ type: 'ping' }))
    }, 25000)

    return () => {
      clearInterval(pingInterval)
      ws.close()
    }
  }

  function enviarMensaje(msg: Record<string, unknown>) {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(msg))
  }

  function enviarChat() {
    const text = chatInput.trim()
    if (!text) return
    enviarMensaje({ type: 'chat_message', text })
    setChatInput('')
  }

  function handleVideoPlay() {
    if (!esAnfitrion || suppressNextSync.current) {
      suppressNextSync.current = false
      return
    }
    enviarMensaje({ type: 'play', position: videoRef.current?.currentTime ?? 0 })
  }

  function handleVideoPause() {
    if (!esAnfitrion || suppressNextSync.current) {
      suppressNextSync.current = false
      return
    }
    enviarMensaje({ type: 'pause', position: videoRef.current?.currentTime ?? 0 })
  }

  function handleVideoSeeked() {
    if (!esAnfitrion || suppressNextSync.current) {
      suppressNextSync.current = false
      return
    }
    enviarMensaje({ type: 'seek', position: videoRef.current?.currentTime ?? 0 })
  }

  function handleTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  function handleLoadedMetadata() {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
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
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold">Watch Party</h1>

        {!sala && (
          <div className="mx-auto max-w-2xl space-y-6">
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {videoUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="h-full w-full bg-black"
                    autoPlay
                    muted={muted}
                    playsInline
                    controls={esAnfitrion}
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                    onSeeked={handleVideoSeeked}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                  {!esAnfitrion && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="h-1 bg-white/10">
                        <div
                          className="h-full bg-[var(--color-primary)] transition-all duration-200"
                          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-white/50">Siguiendo al anfitrion</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/60">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                          <button
                            onClick={() => {
                              const v = videoRef.current
                              if (v) { v.muted = !v.muted; setMuted(v.muted) }
                            }}
                            className="p-1 text-white/70 hover:text-white"
                          >
                            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={muted ? 0 : volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              setVolume(val)
                              const v = videoRef.current
                              if (v) { v.volume = val; v.muted = val === 0; setMuted(val === 0) }
                            }}
                            className="w-16 h-1 accent-[var(--color-primary)] cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-white/[0.03]">
                  <p className="text-sm text-[var(--color-denim-400)]">Cargando video...</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h2 className="mb-2 text-sm font-semibold">Sala activa</h2>
                <p className="text-xs text-[var(--color-denim-300)]">
                  Codigo: <span className="font-mono font-bold text-white">{sala.codigoInvite}</span>
                </p>
                <button onClick={handleCopyLink} className="mt-1 text-xs text-[var(--color-primary)] hover:underline">
                  {copiado ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <h3 className="mb-3 text-xs font-semibold text-[var(--color-denim-200)]">
                  Participantes ({participantes.length})
                </h3>
                <ul className="space-y-2">
                  {participantes.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-xs">
                      <span className={`h-2 w-2 rounded-full ${p.conectado ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span>{p.perfilNombre}</span>
                      {p.esAnfitrion && (
                        <span className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[9px] text-[var(--color-primary)]">
                          Anfitrion
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <div className="px-4 pt-3 pb-1">
                  <h3 className="text-xs font-semibold text-[var(--color-denim-200)]">Chat</h3>
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 max-h-40 scrollbar-thin">
                  {mensajesChat.length === 0 && (
                    <p className="text-[10px] text-[var(--color-denim-500)]">Sin mensajes aun</p>
                  )}
                  {mensajesChat.map((m, i) => (
                    <p key={i} className="text-xs leading-relaxed">
                      <span className="font-semibold text-[var(--color-primary)]">{m.perfilNombre}</span>
                      <span className="text-white/80">: {m.text}</span>
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') enviarChat() }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.05] px-2.5 h-8 text-xs text-white outline-none placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)]"
                  />
                  <button
                    onClick={enviarChat}
                    disabled={!chatInput.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white disabled:opacity-40"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button onClick={() => navigate(-1)} className="text-xs text-[var(--color-denim-400)] hover:text-white">
                ← Salir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
