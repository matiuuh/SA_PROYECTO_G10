import { Link } from 'react-router-dom'
import { Logo } from '@/components/atoms'

export function Footer() {
  return (
    <footer className="bg-[#080c14] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 flex flex-col gap-4">
            <Logo />
            <p className="text-sm text-[var(--color-denim-400)] max-w-xs leading-relaxed">
              La plataforma de streaming que te conecta con el mejor cine del mundo.
              Miles de títulos, una sola suscripción. Quetzal TV.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Plataforma</h4>
            <ul className="flex flex-col gap-2">
              {['Catálogo', 'Novedades', 'Géneros', 'Descarga offline'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-sm text-[var(--color-denim-400)] hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Compañía</h4>
            <ul className="flex flex-col gap-2">
              {['Sobre nosotros', 'Planes', 'Blog', 'Contacto'].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-sm text-[var(--color-denim-400)] hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--color-denim-500)]">
            © {new Date().getFullYear()} Quetzal TV. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            {['Privacidad', 'Términos', 'Cookies'].map((item) => (
              <Link key={item} to="#" className="text-xs text-[var(--color-denim-500)] hover:text-white transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
