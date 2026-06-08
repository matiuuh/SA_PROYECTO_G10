import { Outlet } from 'react-router-dom'
import { AppNavbar } from '@/components/organisms'

export function PrivateLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <AppNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  )
}
