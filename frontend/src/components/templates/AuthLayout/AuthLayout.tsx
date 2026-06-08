import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#080c14]">
      <Outlet />
    </div>
  )
}
