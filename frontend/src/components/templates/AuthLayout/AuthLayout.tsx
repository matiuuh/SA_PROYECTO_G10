import { Navigate, Outlet } from 'react-router-dom'
import { getActiveSession } from '@/lib/auth'

export function AuthLayout() {
  if (getActiveSession()) {
    return <Navigate to="/profiles" replace />
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      <Outlet />
    </div>
  )
}
