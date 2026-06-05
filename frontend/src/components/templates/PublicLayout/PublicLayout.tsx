import { Outlet } from 'react-router-dom'
import { Navbar, Footer } from '@/components/organisms'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#080c14]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
