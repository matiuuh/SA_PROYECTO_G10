import { Link } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { Button, Badge, ScrollReveal } from '@/components/atoms'
import { SectionHeading } from '@/components/molecules'
import type { SubscriptionPlan } from '@/types/subscription'

interface PricingSectionProps {
  plans: SubscriptionPlan[]
}

function formatCurrency(amount: string, currency: string): string {
  const numericAmount = Number(amount)
  if (Number.isNaN(numericAmount)) {
    return `${currency} ${amount}`
  }

  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(numericAmount)
}

function buildPlanFeatures(plan: SubscriptionPlan): string[] {
  const features = [
    `Hasta ${plan.perfiles_maximos} perfil${plan.perfiles_maximos === 1 ? '' : 'es'}`,
    `Cobro mensual en ${plan.moneda_base}`,
  ]

  if (plan.descripcion) {
    features.unshift(plan.descripcion)
  }

  return features
}

export function PricingSection({ plans }: PricingSectionProps) {
  const orderedPlans = [...plans].sort((left, right) => Number(left.precio_base) - Number(right.precio_base))
  const popularPlanId = orderedPlans[Math.floor(orderedPlans.length / 2)]?.id

  return (
    <section id="pricing" className="relative overflow-hidden bg-[#080c14] py-24">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 110%, rgba(26,95,180,0.22) 0%, transparent 70%)',
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up" className="relative z-10 mb-16 flex justify-center">
          <SectionHeading
            eyebrow="Planes"
            title="Elige tu plan perfecto"
            subtitle="Estos planes se cargan directamente desde el backend de suscripciones."
            centered
          />
        </ScrollReveal>

        {orderedPlans.length > 0 ? (
          <div className="relative z-10 grid items-stretch gap-8 md:grid-cols-3">
            {orderedPlans.map((plan, i) => {
              const isPopular = plan.id === popularPlanId

              return (
                <ScrollReveal key={plan.id} variant="fade-up" delay={i * 100}>
                  <div
                    className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
                      isPopular
                        ? 'scale-105 border-[var(--color-denim-500)] bg-gradient-to-b from-[var(--color-denim-700)] to-[var(--color-denim-800)] shadow-2xl shadow-[var(--color-denim-900)]/60'
                        : 'border-white/[0.07] bg-[#0d1220] hover:border-[var(--color-denim-600)]/50'
                    }`}
                  >
                    {isPopular ? (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                        <Badge variant="warning" className="gap-1.5 px-4 py-1 text-sm">
                          <Zap size={12} fill="currentColor" strokeWidth={0} />
                          Mas popular
                        </Badge>
                      </div>
                    ) : null}

                    <div className="mb-6">
                      <h3 className="mb-1 text-lg font-bold text-white">{plan.nombre}</h3>
                      <p
                        className={`mb-4 text-sm ${
                          isPopular ? 'text-[var(--color-denim-100)]' : 'text-[var(--color-denim-300)]'
                        }`}
                      >
                        {plan.descripcion || 'Plan disponible actualmente en Quetzal TV.'}
                      </p>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-extrabold text-white">
                          {formatCurrency(plan.precio_base, plan.moneda_base)}
                        </span>
                        <span
                          className={`mb-1 text-sm ${
                            isPopular ? 'text-[var(--color-denim-100)]' : 'text-[var(--color-denim-400)]'
                          }`}
                        >
                          /mes
                        </span>
                      </div>
                    </div>

                    <ul className="mb-8 flex flex-1 flex-col gap-3">
                      {buildPlanFeatures(plan).map((feature) => (
                        <li
                          key={feature}
                          className={`flex items-center gap-2 text-sm ${
                            isPopular ? 'text-white' : 'text-[var(--color-denim-300)]'
                          }`}
                        >
                          <Check size={14} className="shrink-0 text-[var(--color-success)]" strokeWidth={2.5} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link to="/register">
                      <Button
                        variant={isPopular ? 'outline' : 'primary'}
                        size="md"
                        className={`w-full ${isPopular ? 'border-white text-white hover:bg-white/10' : ''}`}
                      >
                        Elegir plan
                      </Button>
                    </Link>
                  </div>
                </ScrollReveal>
              )
            })}
          </div>
        ) : (
          <div className="relative z-10 rounded-2xl border border-white/[0.08] bg-[#0d1220] px-6 py-12 text-center text-sm text-[var(--color-denim-300)]">
            Aun no hay planes activos disponibles para mostrar.
          </div>
        )}
      </div>
    </section>
  )
}
