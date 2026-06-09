import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Logo, Select } from '@/components/atoms'
import LoginIllustration from '@/assets/Auth/Login.svg'
import RegisterIllustration from '@/assets/Auth/Register.svg'
import { storeSession } from '@/lib/auth'
import { loginUser, registerUser } from '@/lib/usuario-api'
import type { AuthResponse } from '@/types/auth'
import type { SelectOption } from '@/components/atoms'

type Mode = 'login' | 'register'

type AuthLocationState = {
  from?: string
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg bg-[#111827] border border-white/[0.08] text-white placeholder:text-[var(--color-denim-600)] focus:outline-none focus:border-[var(--color-denim-500)] transition-colors text-sm'

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Bolivia', label: 'Bolivia' },
  { value: 'Brasil', label: 'Brasil' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Chile', label: 'Chile' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'Costa Rica', label: 'Costa Rica' },
  { value: 'Cuba', label: 'Cuba' },
  { value: 'Ecuador', label: 'Ecuador' },
  { value: 'El Salvador', label: 'El Salvador' },
  { value: 'Espana', label: 'Espana' },
  { value: 'Estados Unidos', label: 'Estados Unidos' },
  { value: 'Guatemala', label: 'Guatemala' },
  { value: 'Honduras', label: 'Honduras' },
  { value: 'Mexico', label: 'Mexico' },
  { value: 'Nicaragua', label: 'Nicaragua' },
  { value: 'Panama', label: 'Panama' },
  { value: 'Paraguay', label: 'Paraguay' },
  { value: 'Peru', label: 'Peru' },
  { value: 'Puerto Rico', label: 'Puerto Rico' },
  { value: 'Republica Dominicana', label: 'Republica Dominicana' },
  { value: 'Uruguay', label: 'Uruguay' },
  { value: 'Venezuela', label: 'Venezuela' },
]

function toSession(auth: AuthResponse) {
  return {
    accessToken: auth.access_token,
    tokenType: auth.token_type,
    expiresAt: auth.expires_at,
    account: auth.account,
  }
}

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = (location.state ?? {}) as AuthLocationState

  const [mode, setMode] = useState<Mode>(location.pathname === '/register' ? 'register' : 'login')
  const [sliding, setSliding] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    country: '',
    password: '',
    confirmPassword: '',
  })

  const redirectTo = useMemo(() => locationState.from ?? '/panel', [locationState.from])

  useEffect(() => {
    const target: Mode = location.pathname === '/register' ? 'register' : 'login'
    if (target !== mode) switchMode(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  function switchMode(target?: Mode) {
    const next = target ?? (mode === 'login' ? 'register' : 'login')
    if (next === mode || sliding) return

    setLoginError('')
    setRegisterError('')
    setSliding(true)

    setTimeout(() => {
      setMode(next)
      setSliding(false)
      navigate(next === 'login' ? '/login' : '/register', { replace: true })
    }, 350)
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setLoginError('')

    try {
      const auth = await loginUser({
        correo: loginForm.email.trim(),
        contrasena: loginForm.password,
      })

      storeSession(toSession(auth))
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No se pudo iniciar sesion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRegisterError('')

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Las contrasenas no coinciden.')
      return
    }

    if (!registerForm.country) {
      setRegisterError('Debes seleccionar un pais.')
      return
    }

    setIsSubmitting(true)

    try {
      const auth = await registerUser({
        nombre: registerForm.name.trim(),
        correo: registerForm.email.trim(),
        contrasena: registerForm.password,
        pais: registerForm.country.trim(),
      })

      storeSession(toSession(auth))
      navigate('/panel', { replace: true })
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'No se pudo crear la cuenta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLogin = mode === 'login'
  const panelOrder = isLogin ? 'flex-row' : 'flex-row-reverse'

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-4 py-10">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 50% at 50% 0%, var(--color-denim-600), transparent)',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="flex justify-center mb-8">
          <Link to="/"><Logo /></Link>
        </div>

        <div
          className={`flex ${panelOrder} rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.07] transition-all duration-500`}
          style={{ minHeight: 540 }}
        >
          <div
            className="hidden md:flex flex-col items-center justify-center w-1/2 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d1a35 0%, #0a1628 100%)' }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(26,95,180,0.25) 0%, transparent 70%)',
              }}
            />
            <div
              className={`relative z-10 flex flex-col items-center gap-6 px-10 transition-all duration-500 ${
                sliding ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              <img
                src={isLogin ? LoginIllustration : RegisterIllustration}
                alt={isLogin ? 'Login illustration' : 'Register illustration'}
                className="w-72 h-72 object-contain drop-shadow-2xl"
              />
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">
                  {isLogin ? 'Bienvenido de nuevo' : 'Unete hoy'}
                </h2>
                <p className="text-sm text-[var(--color-denim-300)] leading-relaxed max-w-xs">
                  {isLogin
                    ? 'Accede a todo tu contenido favorito en un solo lugar.'
                    : 'Crea tu cuenta gratis y empieza a disfrutar sin limites.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#0d1220] flex flex-col justify-center px-8 py-10 md:px-12">
            <div
              className={`transition-all duration-350 ${
                sliding ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
            >
              {isLogin ? (
                <>
                  <h1 className="text-2xl font-bold text-white mb-1">Iniciar sesion</h1>
                  <p className="text-sm text-[var(--color-denim-300)] mb-8">
                    Continua disfrutando tu contenido favorito.
                  </p>

                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="login-email" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Correo electronico
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="tu@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="text-sm font-medium text-[var(--color-denim-200)]">
                          Contrasena
                        </label>
                      </div>
                      <input
                        id="login-password"
                        type="password"
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        className={inputClass}
                      />
                    </div>

                    {loginError && (
                      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {loginError}
                      </p>
                    )}

                    <Button type="submit" variant="primary" size="md" className="w-full mt-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Iniciando sesion...' : 'Iniciar sesion'}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-[var(--color-denim-400)] mt-6">
                    No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-[var(--color-denim-300)] hover:text-white transition-colors font-medium"
                    >
                      Registrate gratis
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-white mb-1">Crea tu cuenta</h1>
                  <p className="text-sm text-[var(--color-denim-400)] mb-6">
                    Empieza gratis. Sin tarjeta de credito.
                  </p>

                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg-name" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Nombre completo
                      </label>
                      <input
                        id="reg-name"
                        name="name"
                        type="text"
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Juan Garcia"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg-email" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Correo electronico
                      </label>
                      <input
                        id="reg-email"
                        name="email"
                        type="email"
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="tu@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg-country" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Pais
                      </label>
                      <Select
                        value={registerForm.country}
                        onChange={(value) => setRegisterForm((prev) => ({ ...prev, country: value }))}
                        options={COUNTRY_OPTIONS}
                        placeholder="Selecciona tu pais"
                        className="w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg-password" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Contrasena
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Minimo 8 caracteres"
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
                      <label htmlFor="reg-confirm" className="text-sm font-medium text-[var(--color-denim-200)]">
                        Confirmar contrasena
                      </label>
                      <input
                        id="reg-confirm"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={registerForm.confirmPassword}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repite tu contrasena"
                        className={inputClass}
                      />
                    </div>

                    {registerError && (
                      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {registerError}
                      </p>
                    )}

                    <Button type="submit" variant="primary" size="md" className="w-full mt-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                    </Button>
                  </form>

                  <p className="text-center text-sm text-[var(--color-denim-500)] mt-6">
                    Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[var(--color-denim-300)] hover:text-white transition-colors font-medium"
                    >
                      Iniciar sesion
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
