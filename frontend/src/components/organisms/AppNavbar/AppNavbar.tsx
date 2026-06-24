import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Settings,
  LogOut,
  ChevronDown,
  User,
  History,
  X,
  Tv,
} from 'lucide-react'
import { Logo } from '@/components/atoms'
import { clearSession, getActiveSession, getStoredActiveProfile, isAdminRole } from '@/lib/auth'
import { logoutUser } from '@/lib/usuario-api'
import { getSubscriptionStatusByAccount } from '@/lib/suscripcion-api'

export function AppNavbar() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const activeProfile = getStoredActiveProfile()
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [watchPartyOpen, setWatchPartyOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setHidden(current > lastScrollY.current && current > 80)
      lastScrollY.current = current
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    async function checkSubscription() {
      if (!session?.account.id || !session?.accessToken) return
      try {
        const status = await getSubscriptionStatusByAccount(session.account.id)
        setHasSubscription(status.tiene_suscripcion)
      } catch {
        setHasSubscription(false)
      }
    }
    void checkSubscription()
  }, [session])

  const isVisible = !hidden || hovered
  const accountName = session?.account.nombre ?? 'Usuario'
  const accountEmail = session?.account.correo ?? 'usuario@quetzal.tv'
  const accountInitial = accountName.charAt(0).toUpperCase() || 'U'
  const isAdmin = session ? isAdminRole(session.account.rol) : false

  const shouldForceLogout = (message: string) => {
    const normalized = message.toLowerCase()
    return (
      normalized.includes('sesion') ||
      normalized.includes('session') ||
      normalized.includes('token invalido') ||
      normalized.includes('authorization')
    )
  }

  const handleLogout = async () => {
    setLogoutError('')

    try {
      if (session?.accessToken) {
        await logoutUser(session.accessToken)
      }
      clearSession()
      setProfileOpen(false)
      navigate('/login', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar el cierre de sesion.'
      if (shouldForceLogout(message)) {
        clearSession()
        setProfileOpen(false)
        navigate('/login', { replace: true })
        return
      }

      setLogoutError('No fue posible cerrar sesion. Intenta nuevamente.')
      setProfileOpen(false)
    }
  }

  return (
    <>
      {logoutError && (
        <div className="fixed top-20 right-4 z-[60] max-w-sm rounded-xl border border-[var(--color-error)]/30 bg-[#2a1013] px-4 py-3 shadow-2xl shadow-black/50">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white">{logoutError}</p>
            <button
              type="button"
              onClick={() => setLogoutError('')}
              className="text-[var(--color-denim-400)] hover:text-white transition-colors"
              aria-label="Cerrar mensaje"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed top-0 inset-x-0 z-50 h-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <header
        className={`fixed top-0 inset-x-0 z-50 h-16 bg-[#080c14]/95 backdrop-blur-md border-b border-white/[0.06] transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link to="/panel">
            <Logo />
          </Link>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Link
                to="/subscription/plans"
                aria-label="Planes"
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
              >
                <span className="hidden sm:inline">Planes</span>
                <span className="sm:hidden">Plan</span>
              </Link>
            )}

            <div className="relative">
              <button
                onClick={() => { setWatchPartyOpen((v) => !v); setJoinCode('') }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
                aria-label="Watch Party"
              >
                <Tv size={16} strokeWidth={1.75} />
                <span className="hidden sm:inline">Watch Party</span>
              </button>

              {watchPartyOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setWatchPartyOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-xl border border-white/[0.08] bg-[#0d1220] shadow-2xl shadow-black/60 overflow-hidden">
                    <div className="p-3">
                      <p className="mb-2 text-xs font-medium text-[var(--color-denim-400)]">Unirse con codigo</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="Codigo"
                          maxLength={10}
                          className="flex-1 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 h-9 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                        />
                        <button
                          onClick={() => {
                            if (joinCode.trim()) {
                              navigate(`/watch-party?codigo=${joinCode.trim()}`)
                              setWatchPartyOpen(false)
                            }
                          }}
                          disabled={!joinCode.trim()}
                          className="rounded-lg bg-[var(--color-primary)] px-3 h-9 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Unirse
                        </button>
                      </div>
                      <Link
                        to="/panel"
                        onClick={() => setWatchPartyOpen(false)}
                        className="mt-2 block text-center text-xs text-[var(--color-denim-500)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        o crea una sala desde una pelicula
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {hasSubscription && (
              <>
                <div className="w-px h-5 bg-white/[0.08]" />

                <Link
                  to="/profiles"
                  aria-label="Perfiles"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
                >
                  <span className="hidden md:inline">
                    {activeProfile ? `Perfil: ${activeProfile.nombre}` : 'Perfiles'}
                  </span>
                  <span className="md:hidden">Perfil</span>
                </Link>

                <div className="w-px h-5 bg-white/[0.08]" />

                <Link
                  to="/history"
                  aria-label="Historial"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
                >
                  <History size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">Historial</span>
                </Link>

                <div className="w-px h-5 bg-white/[0.08]" />
              </>
            )}

            <div className="relative">
              <button
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors duration-200"
                aria-label="Menu de perfil"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-denim-600)] to-[var(--color-denim-900)] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{accountInitial}</span>
                </div>
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  className={`text-[var(--color-denim-500)] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-white/[0.08] bg-[#0d1220] shadow-2xl shadow-black/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-xs text-[var(--color-denim-400)]">Conectado como</p>
                      <p className="text-sm font-medium text-white truncate">{accountEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-denim-300)] hover:text-white hover:bg-white/[0.04] transition-colors duration-150"
                      >
                        <User size={13} strokeWidth={1.75} />
                        Mi perfil
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-denim-300)] hover:text-white hover:bg-white/[0.04] transition-colors duration-150"
                      >
                        <Settings size={13} strokeWidth={1.75} />
                        Ajustes
                      </Link>
                      <div className="mx-3 my-1 h-px bg-white/[0.06]" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--color-error)] hover:bg-white/[0.04] transition-colors duration-150"
                      >
                        <LogOut size={13} strokeWidth={1.75} />
                        Cerrar sesion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
