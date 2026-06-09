import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Settings,
  LogOut,
  ChevronDown,
  User,
  History,
  Search,
  X,
} from 'lucide-react'
import { Logo } from '@/components/atoms'
import { clearSession, getActiveSession } from '@/lib/auth'
import { logoutUser } from '@/lib/usuario-api'

export function AppNavbar() {
  const navigate = useNavigate()
  const session = getActiveSession()
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hidden, setHidden] = useState(false)
  const [hovered, setHovered] = useState(false)
  const lastScrollY = useRef(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setHidden(current > lastScrollY.current && current > 80)
      lastScrollY.current = current
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isVisible = !hidden || hovered
  const accountName = session?.account.nombre ?? 'Usuario'
  const accountEmail = session?.account.correo ?? 'usuario@quetzal.tv'
  const accountInitial = accountName.charAt(0).toUpperCase() || 'U'

  const handleSearchToggle = () => {
    setSearchOpen((value) => {
      if (!value) {
        setTimeout(() => searchInputRef.current?.focus(), 50)
      } else {
        setSearchQuery('')
      }
      return !value
    })
  }

  const handleLogout = async () => {
    try {
      if (session?.accessToken) {
        await logoutUser(session.accessToken)
      }
    } catch {
      // Ignore logout errors and clear the local session anyway.
    } finally {
      clearSession()
      setProfileOpen(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
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
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <div className="absolute inset-0 rounded-xl border border-[var(--color-denim-600)]/70 bg-[#0d1220] shadow-lg shadow-[var(--color-denim-900)]/50 pointer-events-none" />
                  <Search size={15} strokeWidth={2} className="absolute left-3.5 text-[var(--color-denim-400)] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar peliculas, series..."
                    className="relative z-10 w-56 sm:w-80 h-9 pl-9 pr-8 bg-transparent text-sm text-white placeholder:text-[var(--color-denim-600)] focus:outline-none"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar busqueda"
                      className="absolute right-2.5 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
                    >
                      <X size={11} className="text-white" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSearchToggle}
                  aria-label="Cerrar busqueda"
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
                >
                  <X size={17} strokeWidth={1.75} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSearchToggle}
                aria-label="Buscar"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
              >
                <Search size={17} strokeWidth={1.75} />
              </button>
            )}

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
