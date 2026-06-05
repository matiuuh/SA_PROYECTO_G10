import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo, Button } from '@/components/atoms'
import { NavLink } from '@/components/molecules'

export function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex flex-col items-center pt-5 px-4 pointer-events-none">
      <header
        className={`pointer-events-auto w-full max-w-5xl rounded-2xl border transition-all duration-500 ${
          scrolled
            ? 'bg-[#0a0e19]/95 border-white/[0.10] shadow-2xl shadow-black/60 backdrop-blur-xl'
            : 'bg-[#080c14]/70 border-white/[0.06] shadow-lg shadow-black/30 backdrop-blur-md'
        }`}
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/">
              <Logo />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <NavLink to="/" isAnchor>Inicio</NavLink>
              <NavLink to="#features" isAnchor>Características</NavLink>
              <NavLink to="#catalog" isAnchor>Catálogo</NavLink>
              <NavLink to="#pricing" isAnchor>Planes</NavLink>
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Iniciar sesión</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">Comenzar gratis</Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-[var(--color-denim-300)] hover:text-white transition-colors rounded-lg hover:bg-white/5"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-white/[0.06] px-4 py-4 flex flex-col gap-3 rounded-b-2xl">
            <NavLink to="/" isAnchor>Inicio</NavLink>
            <NavLink to="#features" isAnchor>Características</NavLink>
            <NavLink to="#catalog" isAnchor>Catálogo</NavLink>
            <NavLink to="#pricing" isAnchor>Planes</NavLink>
            <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
              <Link to="/login"><Button variant="outline" size="sm" className="w-full">Iniciar sesión</Button></Link>
              <Link to="/register"><Button variant="primary" size="sm" className="w-full">Comenzar gratis</Button></Link>
            </div>
          </div>
        )}
      </header>
    </div>
  )
}
