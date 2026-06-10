import { Navigate, Outlet } from 'react-router-dom'
import { getActiveSession } from '@/lib/auth'

function getHomeRouteByRole(role: string): string {
  return role === 'administrador' ? '/admin' : '/panel'
}

export function AuthLayout() {
  const session = getActiveSession()

  if (session) {
    return <Navigate to={getHomeRouteByRole(session.account.rol)} replace />
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Outlet />
    </div>
  )
}
