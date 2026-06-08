import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import NotFoundSvg from '@/assets/notFound/NoFound.svg'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-lg select-none pointer-events-none">
        <img
          src={NotFoundSvg}
          alt="Página no encontrada"
          className="w-full h-auto drop-shadow-2xl"
          draggable={false}
        />
      </div>

      <div className="mt-2 flex flex-col items-center gap-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Página no encontrada
        </h1>
        <p className="text-[var(--color-denim-400)] text-sm sm:text-base max-w-sm">
          La ruta que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/[0.06] border border-white/[0.08] text-[var(--color-denim-300)] hover:bg-white/[0.10] hover:text-white transition-colors duration-200"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Volver atrás
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-denim-600)] hover:bg-[var(--color-denim-700)] text-white transition-colors duration-200"
        >
          <Home size={15} strokeWidth={1.75} />
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}
