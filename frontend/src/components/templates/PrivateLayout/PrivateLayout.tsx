import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, Clapperboard, BookMarked, User, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/atoms'

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/dashboard',         label: 'Inicio',   icon: Home },
  { to: '/dashboard/catalog', label: 'Catálogo', icon: Clapperboard },
  { to: '/dashboard/my-list', label: 'Mi lista', icon: BookMarked },
  { to: '/dashboard/profile', label: 'Perfil',   icon: User },
]

export function PrivateLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/[0.06] bg-[#080c14]/95 backdrop-blur-md flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <Link to="/dashboard"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  pathname === to
                    ? 'text-white bg-white/[0.07]'
                    : 'text-[var(--color-denim-400)] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-[var(--color-denim-400)] hover:text-white transition-colors"
          >
            <LogOut size={15} strokeWidth={1.75} />
            Cerrar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  )
}
