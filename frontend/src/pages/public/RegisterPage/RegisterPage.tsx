import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Logo } from '@/components/atoms'

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate('/dashboard')
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg bg-[#111827] border border-white/[0.08] text-white placeholder:text-[var(--color-denim-600)] focus:outline-none focus:border-[var(--color-denim-500)] transition-colors text-sm'

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26,95,180,0.30) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>

        <div className="bg-[#0d1220] border border-white/[0.07] rounded-2xl p-8 shadow-2xl shadow-black/60">
          <h1 className="text-2xl font-bold text-white mb-1">Crea tu cuenta</h1>
          <p className="text-sm text-[var(--color-denim-400)] mb-8">
            Empieza gratis. Sin tarjeta de crédito.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-medium text-[var(--color-denim-200)]">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Juan García"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[var(--color-denim-200)]">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[var(--color-denim-200)]">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-denim-500)] hover:text-[var(--color-denim-300)] transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--color-denim-200)]">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                className={inputClass}
              />
            </div>

            <p className="text-xs text-[var(--color-denim-500)] leading-relaxed">
              Al registrarte aceptas nuestros{' '}
              <Link to="#" className="text-[var(--color-denim-400)] hover:text-white transition-colors underline underline-offset-2">
                Términos de servicio
              </Link>{' '}
              y{' '}
              <Link to="#" className="text-[var(--color-denim-400)] hover:text-white transition-colors underline underline-offset-2">
                Política de privacidad
              </Link>.
            </p>

            <Button type="submit" variant="primary" size="md" className="w-full mt-1">
              Crear cuenta gratis
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--color-denim-500)] mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[var(--color-denim-300)] hover:text-white transition-colors font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
