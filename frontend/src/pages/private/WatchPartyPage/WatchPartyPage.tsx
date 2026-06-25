import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Volume2, VolumeX, Users, MessageCircle, Copy, Check,
  ArrowLeft, Monitor, LogIn, Ticket,
} from 'lucide-react'
import { getStoredActiveProfile, getActiveSession } from '@/lib/auth'
import { unirsePorCodigo, getWebSocketUrl } from '@/lib/watchparty-api'
import { getTrailerSignedUrl, updatePlaybackProgress } from '@/lib/streaming-api'
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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function JoinModal({
  open,
  onClose,
  onJoin,
  joining,
  error,
}: {
  open: boolean
  onClose: () => void
  onJoin: (codigo: string) => void
  joining: boolean
  error: string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setInput('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-200"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#141b2d] to-[#0d1321] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent" />

          <div className="px-6 pt-6 pb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/25 to-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20">
              <Ticket className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-lg font-bold text-white">Unirse a Watch Party</h2>
            <p className="mt-1 text-sm text-[var(--color-denim-400)]">
              Ingresa el codigo que compartio el anfitrion
            </p>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim().length >= 4) onJoin(input.trim())
                }}
                placeholder="CODIGO"
                maxLength={8}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-center text-xl font-mono font-bold tracking-[0.4em] text-white outline-none placeholder:tracking-normal placeholder:text-[var(--color-denim-600)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-3 text-sm font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onJoin(input.trim())}
                  disabled={joining || input.trim().length < 4}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
                >
                  {joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Uniendo
                    </span>
                  ) : (
                    'Unirse'
                  )}
                </button>
              </div>
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

export function WatchPartyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
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
  const lastSavedProgressRef = useRef(0)
  const savingProgressRef = useRef(false)

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

  async function persistWatchPartyProgress(force = false) {
    const vid = videoRef.current
    if (!profile?.id || !sala?.contenidoId || !vid) return

    const progressSeconds = Math.floor(vid.currentTime)
    if (!Number.isFinite(progressSeconds) || progressSeconds <= 0) return
    if (!force && progressSeconds - lastSavedProgressRef.current < 10) return
    if (savingProgressRef.current) return

    const totalSeconds = Math.max(
      Math.floor(vid.duration || 0),
      sala.duracionSegundos || 0,
      progressSeconds,
    )

    savingProgressRef.current = true
    try {
      await updatePlaybackProgress({
        perfil_id: profile.id,
        contenido_id: sala.contenidoId,
        progreso_segundos: progressSeconds,
        duracion_total_segundos: totalSeconds,
      })
      lastSavedProgressRef.current = progressSeconds
    } catch {
      // El historial no debe interrumpir la reproduccion sincronizada.
    } finally {
      savingProgressRef.current = false
    }
  }

  function handleVideoPlay() {
    if (!esAnfitrion || suppressNextSync.current) {
      suppressNextSync.current = false
      return
    }
    enviarMensaje({ type: 'play', position: videoRef.current?.currentTime ?? 0 })
  }

  function handleVideoPause() {
    void persistWatchPartyProgress(true)

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
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      void persistWatchPartyProgress()
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      videoRef.current.pause()
    }
  }

  function handleVideoEnded() {
    void persistWatchPartyProgress(true)
  }

  function handleJoin(code?: string) {
    const codigo = (code ?? codigoInput).trim().toUpperCase()
    if (!codigo) return
    setError('')
    setSyncState('joining')
    setModalOpen(false)
    unirsePorCodigo(codigo)
      .then((room) => {
        setSala(room)
        conectarWebSocket(room)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al unirse a la sala')
        setSyncState('idle')
        setModalOpen(true)
      })
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
      <JoinModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onJoin={(code) => {
          setCodigoInput(code)
          handleJoin(code)
        }}
        joining={syncState === 'joining'}
        error={error}
      />

      {!sala && syncState !== 'joining' && (
        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 via-transparent to-transparent" />
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[var(--color-primary)]/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-lg px-4 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20 shadow-lg shadow-[var(--color-primary)]/10">
              <Monitor className="h-10 w-10 text-[var(--color-primary)]" />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white">
              Watch Party
            </h1>
            <p className="mt-3 text-lg text-[var(--color-denim-400)] leading-relaxed">
              Mire contenido junto a sus amigos en tiempo real.
              <br />
              Sincronice la reproduccion y chateen mientras ven.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-[var(--color-primary)]/25 transition-all hover:brightness-110 hover:shadow-2xl hover:shadow-[var(--color-primary)]/30 active:scale-[0.97]"
              >
                <LogIn size={18} />
                Unirse con codigo
              </button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-6 text-center">
              {[
                { icon: Ticket, label: 'Codigo unico', desc: 'Comparte el codigo de la sala' },
                { icon: Users, label: 'Multi-usuario', desc: 'Hasta 10 participantes' },
                { icon: MessageCircle, label: 'Chat en vivo', desc: 'Chatea mientras ves' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                    <item.icon size={18} className="text-[var(--color-primary)]" />
                  </div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--color-denim-500)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {syncState === 'joined' && sala && (
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-[var(--color-denim-400)] transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <ArrowLeft size={16} />
                  Salir
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-1.5">
                    <span className="text-[10px] text-[var(--color-denim-500)]">CODIGO</span>
                    <span className="font-mono text-sm font-bold tracking-widest text-white">{sala.codigoInvite}</span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.1] hover:text-white"
                  >
                    {copiado ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copiado ? 'Copiado' : 'Invitar'}
                  </button>
                </div>
              </div>

              {videoUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/[0.06]">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="h-full w-full bg-black"
                    preload="metadata"
                    muted={muted}
                    playsInline
                    controls={esAnfitrion}
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                    onSeeked={handleVideoSeeked}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                  />
                  {!esAnfitrion && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pt-12">
                      <div className="h-1 bg-white/10">
                        <div
                          className="h-full bg-[var(--color-primary)] transition-all duration-200 shadow-[0_0_8px_rgba(var(--color-primary),0.5)]"
                          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)]/15">
                            <Volume2 size={12} className="text-[var(--color-primary)]" />
                          </div>
                          <span className="text-xs text-white/60">Siguiendo al anfitrion</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/50 font-mono tabular-nums">
                            {formatTime(currentTime)} <span className="text-white/30">/</span> {formatTime(duration)}
                          </span>
                          <button
                            onClick={() => {
                              const v = videoRef.current
                              if (v) { v.muted = !v.muted; setMuted(v.muted) }
                            }}
                            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>
                          <div className="flex items-center gap-1.5">
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
                              className="w-20 h-1 accent-[var(--color-primary)] cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {esAnfitrion && (
                    <div className="absolute top-3 left-3 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white/70">
                      Eres el host — tus controles se sincronizan
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/[0.06]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                    <p className="text-sm text-[var(--color-denim-400)]">Cargando video...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 h-full">
              <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-denim-200)] uppercase tracking-widest">
                    <Users size={14} />
                    Participantes ({participantes.length})
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {participantes.map((p) => {
                    const esTuPerfil = p.perfilId === profile?.id
                    return (
                      <li
                        key={p.id}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                          esTuPerfil
                            ? 'bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/15'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          p.esAnfitrion
                            ? 'bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/25'
                            : 'bg-white/[0.08] text-white/70'
                        }`}>
                          {getInitials(p.perfilNombre)}
                          {p.conectado && (
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#080c14] shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{p.perfilNombre}</span>
                            {esTuPerfil && (
                              <span className="text-[10px] text-[var(--color-denim-400)] font-normal">(tu)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--color-denim-500)]">
                            {p.conectado ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                        {p.esAnfitrion && (
                          <span className="shrink-0 rounded-md bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
                            Host
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="flex flex-1 flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden min-h-[20rem]">
                <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                  <MessageCircle size={14} className="text-[var(--color-primary)]" />
                  <h3 className="text-[11px] font-semibold text-[var(--color-denim-200)] uppercase tracking-widest">Chat</h3>
                  {mensajesChat.length > 0 && (
                    <span className="ml-auto text-[10px] text-[var(--color-denim-500)]">
                      {mensajesChat.length} {mensajesChat.length === 1 ? 'mensaje' : 'mensajes'}
                    </span>
                  )}
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
                  {mensajesChat.length === 0 && (
                    <div className="flex h-full items-center justify-center min-h-[8rem]">
                      <div className="text-center">
                        <MessageCircle size={24} className="mx-auto mb-2 text-[var(--color-denim-600)]" />
                        <p className="text-xs text-[var(--color-denim-500)]">Sin mensajes aun</p>
                        <p className="text-[10px] text-[var(--color-denim-600)] mt-0.5">Escribe algo para empezar</p>
                      </div>
                    </div>
                  )}
                  {mensajesChat.map((m, i) => {
                    const esMio = m.perfilId === profile?.id
                    return (
                      <div key={i} className={`flex ${esMio ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200`}>
                        <div className={`max-w-[88%] ${esMio ? 'order-1' : 'order-1'}`}>
                          <div className={`text-[10px] font-medium mb-1 px-1 ${esMio ? 'text-right text-[var(--color-denim-400)]' : 'text-left text-[var(--color-denim-400)]'}`}>
                            {esMio ? 'tu' : m.perfilNombre}
                          </div>
                          <div className={`rounded-2xl px-3.5 py-2.5 ${
                            esMio
                              ? 'bg-gradient-to-r from-[var(--color-primary)]/25 to-[var(--color-primary)]/15 rounded-tr-md'
                              : 'bg-white/[0.07] rounded-tl-md'
                          }`}>
                            <p className="text-xs leading-relaxed text-white/90">{m.text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') enviarChat() }}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-[var(--color-denim-500)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                    />
                    <button
                      onClick={enviarChat}
                      disabled={!chatInput.trim()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white shadow-lg shadow-[var(--color-primary)]/15 transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
