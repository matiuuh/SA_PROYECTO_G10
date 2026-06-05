import { Link } from 'react-router-dom'
import { CheckCircle, Sparkles, PlayCircle } from 'lucide-react'
import { Button, Badge, ScrollReveal } from '@/components/atoms'
import MovieNightIllustration from '@/assets/landing/movie-night-rafiki.svg'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080c14]">
      {/* Primary blue glow — top center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(26,95,180,0.45) 0%, transparent 70%)',
        }}
      />
      {/* Secondary accent — bottom right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 45% 35% at 90% 100%, rgba(40,120,207,0.18) 0%, transparent 70%)',
        }}
      />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-denim-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-denim-300) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="flex flex-col items-center lg:items-start gap-8 text-center lg:text-left">
            <ScrollReveal variant="fade-down" delay={0} threshold={0}>
              <Badge variant="info" className="gap-1.5 text-sm px-4 py-1.5 border border-[var(--color-denim-700)] bg-[var(--color-denim-950)]/70 text-[var(--color-denim-200)] backdrop-blur-sm">
                <Sparkles size={13} className="text-[var(--color-denim-300)]" />
                Más de 10,000 títulos disponibles
              </Badge>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={100} threshold={0}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
                El cine en la palma{' '}
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, #8cb9ed 0%, #2878cf 50%, #1a5fb4 100%)',
                  }}
                >
                  de tu mano
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={200} threshold={0}>
              <p className="text-lg sm:text-xl text-[var(--color-denim-300)] max-w-xl leading-relaxed">
                Accede a miles de películas y series en alta definición. Sin anuncios, sin interrupciones.
                Disfruta donde quieras, cuando quieras.
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={300} threshold={0}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="shadow-lg shadow-[var(--color-denim-700)]/40">
                    <PlayCircle size={18} />
                    Empezar ahora — es gratis
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fade" delay={450} threshold={0}>
              <div className="flex flex-col sm:flex-row items-center gap-5 pt-2 text-sm text-[var(--color-denim-400)]">
                {['Sin tarjeta de crédito', 'Cancela cuando quieras', 'HD & 4K'].map((text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-[var(--color-success)]" />
                    {text}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right column - Image */}
          <ScrollReveal variant="fade-left" delay={200} threshold={0}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-denim-500)]/20 to-transparent rounded-3xl blur-2xl" />
              <img
                src={MovieNightIllustration}
                alt="Personas disfrutando palomitas y películas"
                className="relative w-full max-w-lg mx-auto drop-shadow-2xl"
              />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
