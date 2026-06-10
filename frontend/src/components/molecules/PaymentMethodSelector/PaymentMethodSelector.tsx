import { CreditCard } from 'lucide-react'
import { Radio } from '@/components/atoms'

interface PaymentMethodSelectorProps {
  value: string
  onChange: (value: string) => void
}

const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Tarjeta de crédito/débito',
    description: 'Visa, Mastercard, American Express',
    icon: CreditCard,
  },
]

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      {PAYMENT_METHODS.map(({ id, label, description, icon: Icon }) => (
        <div
          key={id}
          className={`p-4 rounded-lg border transition-colors ${
            value === id
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-white/[0.07] hover:border-white/[0.12]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0d1220] border border-white/[0.07] flex items-center justify-center text-[var(--color-denim-400)]">
              <Icon size={18} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <Radio
                name="paymentMethod"
                value={id}
                checked={value === id}
                onChange={(e) => onChange(e.target.value)}
                label={label}
                description={description}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
