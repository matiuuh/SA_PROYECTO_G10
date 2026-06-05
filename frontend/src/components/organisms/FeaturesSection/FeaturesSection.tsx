import { Monitor, Smartphone, Download, Users, Bell, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SectionHeading, FeatureCard } from '@/components/molecules'
import { ScrollReveal } from '@/components/atoms'

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Monitor,
    title: 'Calidad 4K & HDR',
    description: 'Disfruta de la mejor resolución disponible con soporte para HDR10 y Dolby Vision en todos tus dispositivos.',
  },
  {
    icon: Smartphone,
    title: 'Multidispositivo',
    description: 'Ve en tu TV, computadora, tablet o teléfono. Sincroniza tu progreso entre todos tus dispositivos al instante.',
  },
  {
    icon: Download,
    title: 'Descarga offline',
    description: 'Descarga tus películas y series favoritas para verlas sin conexión cuando no tengas internet disponible.',
  },
  {
    icon: Users,
    title: 'Perfiles familiares',
    description: 'Crea hasta 5 perfiles por cuenta con recomendaciones personalizadas y controles parentales integrados.',
  },
  {
    icon: Bell,
    title: 'Notificaciones',
    description: 'Recibe alertas de nuevos estrenos, continuaciones de series y recomendaciones basadas en tu historial.',
  },
  {
    icon: Globe,
    title: 'Subtítulos & audio',
    description: 'Más de 30 idiomas disponibles con subtítulos y doblajes de alta calidad para una experiencia global.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-[#080c14] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(26,95,180,0.25) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up" className="flex justify-center mb-16">
          <SectionHeading
            eyebrow="Características"
            title="Todo lo que necesitas para disfrutar"
            subtitle="Una plataforma diseñada para brindarte la mejor experiencia cinematográfica posible."
            centered
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <ScrollReveal key={feature.title} variant="fade-up" delay={i * 80}>
              <FeatureCard {...feature} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
