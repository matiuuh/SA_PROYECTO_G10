import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppNavbar } from '@/components/organisms'
import { getActiveSession, isAdminRole } from '@/lib/auth'

export function PrivateLayout() {
  const location = useLocation()
  const session = getActiveSession()

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isAdminRole(session.account.rol)) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <AppNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  )
}
