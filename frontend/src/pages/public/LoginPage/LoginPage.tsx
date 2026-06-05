import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Logo } from '@/components/atoms'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 50% 0%, var(--color-denim-600), transparent)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>

        <div className="bg-[#0d1220] border border-white/[0.07] rounded-2xl p-8 shadow-2xl shadow-black/60">
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenido de nuevo</h1>
          <p className="text-sm text-[var(--color-denim-300)] mb-8">
            Inicia sesión para continuar disfrutando.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[var(--color-denim-200)]">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-lg bg-[#111827] border border-white/[0.08] text-white placeholder:text-[var(--color-denim-600)] focus:outline-none focus:border-[var(--color-denim-500)] transition-colors text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[var(--color-denim-200)]">
                  Contraseña
                </label>
                <Link to="#" className="text-xs text-[var(--color-denim-400)] hover:text-white transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-[#111827] border border-white/[0.08] text-white placeholder:text-[var(--color-denim-600)] focus:outline-none focus:border-[var(--color-denim-500)] transition-colors text-sm"
              />
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full mt-1">
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--color-denim-400)] mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[var(--color-denim-300)] hover:text-white transition-colors font-medium">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
