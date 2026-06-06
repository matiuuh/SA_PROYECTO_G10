import { Check, Sparkles } from 'lucide-react'
import { Card, Badge } from '@/components/atoms'
import type { SubscriptionPlan } from '@/types/subscription'

interface PlanCardProps extends SubscriptionPlan {
  selected?: boolean
  onSelect?: () => void
}

export function PlanCard({
  name,
  price,
  interval,
  features,
  popular,
  selected,
  onSelect,
}: PlanCardProps) {
  return (
    <Card
      className={`p-6 cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'hover:border-white/[0.15]'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">${price}</span>
            <span className="text-sm text-[var(--color-denim-400)]">/{interval}</span>
          </div>
        </div>
        {popular && (
          <Badge className="bg-[var(--color-primary)] text-white flex items-center gap-1">
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
              className="text-[var(--color-primary)] mt-0.5 flex-shrink-0"
              strokeWidth={2.5}
            />
            <span className="text-[var(--color-denim-200)]">{feature}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
