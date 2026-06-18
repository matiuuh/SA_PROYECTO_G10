import { useMemo, useState, type FormEvent } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { Input, Button } from '@/components/atoms'
import { PaymentMethodSelector } from '@/components/molecules'
import type { CheckoutFormData } from '@/types/subscription'

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void
  isLoading?: boolean
  initialEmail?: string
  initialName?: string
}

type CheckoutErrors = Partial<Record<keyof CheckoutFormData, string>>

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCardNumber(value: string): string {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiryDate(value: string): string {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function formatCvv(value: string): string {
  return digitsOnly(value).slice(0, 4)
}

function validateExpiryDate(expiryDate: string): string | null {
  if (!/^\d{2}\/\d{2}$/.test(expiryDate)) return 'Usa el formato MM/AA.'

  const [monthValue, yearValue] = expiryDate.split('/')
  const month = Number(monthValue)
  const year = Number(`20${yearValue}`)

  if (month < 1 || month > 12) return 'El mes debe estar entre 01 y 12.'

  const expirationDate = new Date(year, month, 0, 23, 59, 59)
  if (expirationDate < new Date()) return 'La tarjeta ya esta vencida.'

  return null
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

function validateForm(formData: CheckoutFormData): CheckoutErrors {
  const errors: CheckoutErrors = {}

  if (!formData.email.trim()) {
    errors.email = 'El correo es requerido.'
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (formData.paymentMethod === 'card') {
    const cardDigits = digitsOnly(formData.cardNumber)

    if (!cardDigits) {
      errors.cardNumber = 'El numero de tarjeta es requerido.'
    } else if (cardDigits.length !== 16) {
      errors.cardNumber = 'La tarjeta debe tener 16 digitos.'
    }

    if (!formData.cardName.trim()) {
      errors.cardName = 'El nombre en la tarjeta es requerido.'
    } else if (formData.cardName.trim().length < 5 || !/^[A-Za-zÀ-ÿ\s'.-]+$/.test(formData.cardName.trim())) {
      errors.cardName = 'Ingresa el nombre como aparece en la tarjeta.'
    }

    const expiryError = validateExpiryDate(formData.expiryDate)
    if (!formData.expiryDate) {
      errors.expiryDate = 'La fecha de expiracion es requerida.'
    } else if (expiryError) {
      errors.expiryDate = expiryError
    }

    if (!formData.cvv) {
      errors.cvv = 'El codigo de seguridad es requerido.'
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      errors.cvv = 'El CVV debe tener 3 o 4 digitos.'
    }

  }

  return errors
}

export function CheckoutForm({
  onSubmit,
  isLoading,
  initialEmail = '',
  initialName = '',
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: initialEmail,
    cardNumber: '',
    cardName: initialName,
    expiryDate: '',
    cvv: '',
    paymentMethod: 'card',
  })

  const [errors, setErrors] = useState<CheckoutErrors>({})
  const cardDigits = digitsOnly(formData.cardNumber)
  const cardLastFour = cardDigits.length >= 4 ? cardDigits.slice(-4) : '----'
  const isFormReady = useMemo(() => Object.keys(validateForm(formData)).length === 0, [formData])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const nextErrors = validateForm(formData)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit({
      ...formData,
      email: formData.email.trim(),
      cardName: formData.cardName.trim(),
      cardNumber: cardDigits,
    })
  }

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    let nextValue = value
    if (field === 'cardNumber') nextValue = formatCardNumber(value)
    if (field === 'expiryDate') nextValue = formatExpiryDate(value)
    if (field === 'cvv') nextValue = formatCvv(value)

    setFormData((previous) => ({ ...previous, [field]: nextValue }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-white/[0.08] bg-[#0d1220]/70 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Lock size={16} className="text-[var(--color-primary)]" />
          Pago seguro
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-denim-300)]">
          Tus datos se validan antes de procesar el pago. La tarjeta se enviara solo con los digitos necesarios para la simulacion local.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Informacion de contacto</h3>
        <Input
          type="email"
          label="Correo para recibo"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(event) => updateField('email', event.target.value)}
          error={errors.email}
          autoComplete="email"
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-white">Metodo de pago</h3>
        <PaymentMethodSelector
          value={formData.paymentMethod}
          onChange={(value) => updateField('paymentMethod', value)}
        />
      </div>

      {formData.paymentMethod === 'card' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.08] bg-gradient-to-br from-[#10192c] to-[#080c14] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-denim-400)]">
                  Tarjeta
                </p>
                <p className="mt-4 font-mono text-lg font-semibold text-white">
                  {formData.cardNumber || '•••• •••• •••• ••••'}
                </p>
              </div>
              <ShieldCheck size={22} className="text-[var(--color-primary)]" />
            </div>
            <div className="mt-6 flex items-end justify-between gap-4 text-xs text-[var(--color-denim-300)]">
              <span className="truncate uppercase">{formData.cardName || 'NOMBRE EN TARJETA'}</span>
              <span>{formData.expiryDate || 'MM/AA'}</span>
            </div>
          </div>

          <Input
            type="text"
            label="Numero de tarjeta"
            placeholder="4242 4242 4242 4242"
            value={formData.cardNumber}
            onChange={(event) => updateField('cardNumber', event.target.value)}
            error={errors.cardNumber}
            maxLength={19}
            inputMode="numeric"
            autoComplete="cc-number"
          />
          <Input
            type="text"
            label="Nombre en la tarjeta"
            placeholder="Juan Perez"
            value={formData.cardName}
            onChange={(event) => updateField('cardName', event.target.value)}
            error={errors.cardName}
            autoComplete="cc-name"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="text"
              label="Fecha de expiracion"
              placeholder="MM/AA"
              value={formData.expiryDate}
              onChange={(event) => updateField('expiryDate', event.target.value)}
              error={errors.expiryDate}
              maxLength={5}
              inputMode="numeric"
              autoComplete="cc-exp"
            />
            <Input
              type="password"
              label="CVV"
              placeholder="123"
              value={formData.cvv}
              onChange={(event) => updateField('cvv', event.target.value)}
              error={errors.cvv}
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-csc"
            />
          </div>
          <p className="text-xs text-[var(--color-denim-400)]">
            Simulacion local con tarjeta terminada en {cardLastFour}.
          </p>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isLoading || !isFormReady}>
        {isLoading ? 'Procesando...' : 'Confirmar pago'}
      </Button>

      <p className="text-center text-xs text-[var(--color-denim-400)]">
        Al confirmar, aceptas nuestros terminos de servicio y politica de privacidad.
      </p>
    </form>
  )
}
