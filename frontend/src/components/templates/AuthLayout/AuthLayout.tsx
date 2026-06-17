import { Navigate, Outlet } from 'react-router-dom'
import { getActiveSession, getHomeRouteByRole } from '@/lib/auth'

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
