import { useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Film,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  FileClock,
  Tv2,
  X,
} from 'lucide-react'
import { Logo } from '@/components/atoms'
import { clearSession, getActiveSession } from '@/lib/auth'
import { logoutUser } from '@/lib/usuario-api'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <LayoutDashboard size={18} strokeWidth={1.75} /> },
  { label: 'Subir pelicula', to: '/admin/upload/movie', icon: <Film size={18} strokeWidth={1.75} /> },
  { label: 'Subir serie', to: '/admin/upload/series', icon: <Tv2 size={18} strokeWidth={1.75} /> },
  { label: 'Catalogo', to: '/admin/catalog', icon: <List size={18} strokeWidth={1.75} /> },
  { label: 'Auditoria', to: '/admin/audit', icon: <FileClock size={18} strokeWidth={1.75} /> },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const session = getActiveSession()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (session.account.rol !== 'administrador') {
    return <Navigate to="/panel" replace />
  }

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
      await logoutUser(session.accessToken)
      clearSession()
      navigate('/login', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar el cierre de sesion.'
      if (shouldForceLogout(message)) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }

      setLogoutError('No fue posible cerrar sesion. Intenta nuevamente.')
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex">
      {logoutError && (
        <div className="fixed top-5 right-4 z-[70] max-w-sm rounded-xl border border-[var(--color-error)]/30 bg-[#2a1013] px-4 py-3 shadow-2xl shadow-black/50">
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#0a0f1c] border-r border-white/[0.06] transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="h-16 flex items-center px-5 border-b border-white/[0.06] shrink-0">
          <Logo />
          <span className="ml-2 text-xs font-semibold tracking-widest uppercase text-[var(--color-denim-500)]">
            Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-primary)]/15 text-white border border-[var(--color-primary)]/30'
                    : 'text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      isActive
                        ? 'text-[var(--color-denim-300)]'
                        : 'text-[var(--color-denim-600)] group-hover:text-[var(--color-denim-400)]'
                    }
                  >
                    {icon}
                  </span>
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-[var(--color-denim-500)]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 px-3 py-4 border-t border-white/[0.06]">
          <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-denim-600)] to-[var(--color-denim-900)] flex items-center justify-center shrink-0 text-white text-xs font-bold">
              {session.account.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.account.nombre}</p>
              <p className="text-[11px] text-[var(--color-denim-500)] truncate">{session.account.correo}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-error)] hover:bg-white/[0.04] transition-colors duration-150"
          >
            <LogOut size={15} strokeWidth={1.75} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-4 px-4 sm:px-6 lg:px-8 bg-[#080c14]/95 backdrop-blur-md border-b border-white/[0.06] lg:bg-transparent lg:backdrop-blur-none lg:border-b-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.05] transition-colors ${sidebarOpen ? '' : 'hidden'}`}
          >
            <X size={20} />
          </button>
          <h1 className="text-sm font-semibold text-[var(--color-denim-200)] tracking-wide">
            Panel de Administracion
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
