import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/atoms'
import { getActiveSession } from '@/lib/auth'

export function UserProfilePage() {
  const session = getActiveSession()
  const memberSince = session?.account.creado_en
    ? new Date(session.account.creado_en).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
      })
    : 'Reciente'

  return (
    <div className="min-h-screen bg-[#080c14] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">Mi Perfil</h1>
          <p className="text-[var(--color-denim-400)]">
            Visualiza la informacion principal de tu cuenta
          </p>
        </div>

        <Card className="p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-[var(--color-denim-400)]">Nombre</p>
              <p className="mt-1 text-xl font-semibold text-white">{session?.account.nombre ?? 'Usuario Quetzal'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-denim-400)]">Correo</p>
              <p className="mt-1 text-xl font-semibold text-white">{session?.account.correo ?? 'usuario@quetzal.tv'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-denim-400)]">Pais</p>
              <p className="mt-1 text-xl font-semibold text-white">{session?.account.pais ?? 'No definido'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-denim-400)]">Miembro desde</p>
              <p className="mt-1 text-xl font-semibold text-white">{memberSince}</p>
            </div>
          </div>

          <div className="mt-8">
            <Link to="/settings">
              <Button>Editar datos de cuenta</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
