import { useState, type FormEvent } from 'react'
import { Input, Button } from '@/components/atoms'
import { PaymentMethodSelector } from '@/components/molecules'
import type { CheckoutFormData } from '@/types/subscription'

interface CheckoutFormProps {
  onSubmit: (data: CheckoutFormData) => void
  isLoading?: boolean
}

export function CheckoutForm({ onSubmit, isLoading }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    paymentMethod: 'card',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {}
    
    if (!formData.email) newErrors.email = 'El email es requerido'
    if (formData.paymentMethod === 'card') {
      if (!formData.cardNumber) newErrors.cardNumber = 'El número de tarjeta es requerido'
      if (!formData.cardName) newErrors.cardName = 'El nombre es requerido'
      if (!formData.expiryDate) newErrors.expiryDate = 'La fecha de expiración es requerida'
      if (!formData.cvv) newErrors.cvv = 'El CVV es requerido'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
  }

  const updateField = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Información de contacto</h3>
        <Input
          type="email"
          label="Email"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Método de pago</h3>
        <PaymentMethodSelector
          value={formData.paymentMethod}
          onChange={(value) => updateField('paymentMethod', value)}
        />
      </div>

      {formData.paymentMethod === 'card' && (
        <div className="space-y-4">
          <Input
            type="text"
            label="Número de tarjeta"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={(e) => updateField('cardNumber', e.target.value)}
            error={errors.cardNumber}
            maxLength={19}
          />
          <Input
            type="text"
            label="Nombre en la tarjeta"
            placeholder="Juan Pérez"
            value={formData.cardName}
            onChange={(e) => updateField('cardName', e.target.value)}
            error={errors.cardName}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              label="Fecha de expiración"
              placeholder="MM/AA"
              value={formData.expiryDate}
              onChange={(e) => updateField('expiryDate', e.target.value)}
              error={errors.expiryDate}
              maxLength={5}
            />
            <Input
              type="text"
              label="CVV"
              placeholder="123"
              value={formData.cvv}
              onChange={(e) => updateField('cvv', e.target.value)}
              error={errors.cvv}
              maxLength={4}
            />
          </div>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
        {isLoading ? 'Procesando...' : 'Confirmar pago'}
      </Button>

      <p className="text-xs text-center text-[var(--color-denim-400)]">
        Al confirmar, aceptas nuestros términos de servicio y política de privacidad.
      </p>
    </form>
  )
}
