import { type FormEvent, useState } from 'react'
import { Lock, X } from 'lucide-react'

interface PinModalProps {
  titulo: string
  clasificacion: string
  onVerify: (pin: string) => Promise<boolean>
  onCancel: () => void
}

export function PinModal({ titulo, clasificacion, onVerify, onCancel }: PinModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const ratingLabels: Record<string, { label: string; color: string }> = {
    'TP': { label: 'Apta para todo publico', color: 'text-green-400' },
    'PG-13': { label: 'No recomendada para menores de 13', color: 'text-yellow-400' },
    'R': { label: 'Restringida - Mayores de 18', color: 'text-red-400' },
  }

  const ratingInfo = ratingLabels[clasificacion] ?? { label: clasificacion || 'Sin clasificacion', color: 'text-[var(--color-denim-300)]' }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pin.length !== 4) {
      setError('El PIN debe tener exactamente 4 digitos.')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const valido = await onVerify(pin)
      if (!valido) {
        setError('PIN incorrecto. Intenta de nuevo.')
        setPin('')
      }
    } catch {
      setError('Error al verificar el PIN. Intenta de nuevo.')
      setPin('')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1220] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning)]/10">
              <Lock size={22} className="text-[var(--color-warning)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Control Parental</h2>
              <p className="text-sm text-[var(--color-denim-400)]">Ingresa el PIN para reproducir</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-[var(--color-denim-400)] transition-colors hover:text-white"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#080c14] p-4">
          <p className="mb-1 text-sm font-semibold text-white">{titulo}</p>
          <p className={`text-xs font-medium ${ratingInfo.color}`}>
            {ratingInfo.label}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-denim-200)]">
              PIN de seguridad
            </label>
            <input
              type="password"
              value={pin}
              onChange={(event) => {
                const val = event.target.value.replace(/\D/g, '').slice(0, 4)
                setPin(val)
                setError('')
              }}
              placeholder="* * * *"
              maxLength={4}
              inputMode="numeric"
              autoFocus
              className="w-full rounded-xl border border-white/[0.10] bg-[#080c14] px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-[var(--color-denim-600)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[var(--color-denim-300)] transition-colors hover:bg-white/[0.07]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isVerifying || pin.length !== 4}
              className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifying ? 'Verificando...' : 'Verificar PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
