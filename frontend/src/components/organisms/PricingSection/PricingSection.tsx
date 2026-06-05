import { Link } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'
import { Button, Badge, ScrollReveal } from '@/components/atoms'
import { SectionHeading } from '@/components/molecules'

const PLANS = [
  {
    name: 'Básico',
    price: '$4.99',
    period: '/mes',
    description: 'Perfecto para comenzar',
    features: ['1 pantalla simultánea', 'HD 1080p', '10,000+ títulos', 'Sin anuncios'],
    cta: 'Empezar gratis',
    popular: false,
    variant: 'outline' as const,
  },
  {
    name: 'Estándar',
    price: '$9.99',
    period: '/mes',
    description: 'Lo más elegido por familias',
    features: ['3 pantallas simultáneas', '4K + HDR', '10,000+ títulos', 'Descarga offline', 'Perfiles familiares'],
    cta: 'Empezar gratis',
    popular: true,
    variant: 'primary' as const,
  },
  {
    name: 'Premium',
    price: '$14.99',
    period: '/mes',
    description: 'La experiencia completa',
    features: ['5 pantallas simultáneas', '4K + Dolby Vision', 'Catálogo completo', 'Descarga offline', 'Audio Dolby Atmos', 'Acceso anticipado'],
    cta: 'Empezar gratis',
    popular: false,
    variant: 'outline' as const,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 bg-[#080c14] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 110%, rgba(26,95,180,0.22) 0%, transparent 70%)',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up" className="relative z-10 flex justify-center mb-16">
          <SectionHeading
            eyebrow="Planes"
            title="Elige tu plan perfecto"
            subtitle="Todos los planes incluyen prueba gratuita de 30 días. Sin compromiso."
            centered
          />
        </ScrollReveal>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} variant="fade-up" delay={i * 100}>
            <div
              className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-[var(--color-denim-700)] to-[var(--color-denim-800)] border-[var(--color-denim-500)] shadow-2xl shadow-[var(--color-denim-900)]/60 scale-105'
                  : 'bg-[#0d1220] border-white/[0.07] hover:border-[var(--color-denim-600)]/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge variant="warning" className="gap-1.5 text-sm px-4 py-1">
                    <Zap size={12} fill="currentColor" strokeWidth={0} />
                    Más popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className={`text-sm mb-4 ${plan.popular ? 'text-[var(--color-denim-100)]' : 'text-[var(--color-denim-300)]'}`}>
                  {plan.description}
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.popular ? 'text-[var(--color-denim-100)]' : 'text-[var(--color-denim-400)]'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className={`flex items-center gap-2 text-sm ${plan.popular ? 'text-white' : 'text-[var(--color-denim-300)]'}`}>
                    <Check size={14} className="shrink-0 text-[var(--color-success)]" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to="/register">
                <Button
                  variant={plan.popular ? 'outline' : plan.variant}
                  size="md"
                  className={`w-full ${plan.popular ? 'border-white text-white hover:bg-white/10' : ''}`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
