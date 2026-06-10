import { Check, Sparkles } from 'lucide-react'
import { Card, Badge } from '@/components/atoms'
import type { UiSubscriptionPlan } from '@/types/subscription'

interface PlanCardProps extends UiSubscriptionPlan {
  selected?: boolean
  onSelect?: () => void
}

export function PlanCard({
  name,
  description,
  price,
  currency,
  interval,
  features,
  popular,
  selected,
  onSelect,
}: PlanCardProps) {
  return (
    <Card
      className={`p-6 cursor-pointer group transition-all duration-300 ${
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg shadow-[var(--color-primary)]/10 scale-[1.02]'
          : 'hover:border-white/[0.20] hover:bg-white/[0.02] hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1 transition-colors duration-200 group-hover:text-[var(--color-denim-100)]">
            {name}
          </h3>
          <p className="mb-3 text-sm text-[var(--color-denim-400)]">{description}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white transition-all duration-300 group-hover:text-[var(--color-primary)]">
              {currency} {price.toFixed(2)}
            </span>
            <span className="text-sm text-[var(--color-denim-400)]">/{interval}</span>
          </div>
        </div>
        {popular && (
          <Badge className="bg-[var(--color-primary)] text-white flex items-center gap-1 transition-transform duration-300 group-hover:scale-105">
            <Sparkles size={12} />
            Popular
          </Badge>
        )}
      </div>

      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check
              size={16}
              className="text-[var(--color-primary)] mt-0.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              strokeWidth={2.5}
            />
            <span className="text-[var(--color-denim-200)] transition-colors duration-200 group-hover:text-white">
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
