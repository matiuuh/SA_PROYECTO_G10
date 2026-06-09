import { Link } from 'react-router-dom'
import { CheckCircle, Sparkles, PlayCircle, ThumbsUp } from 'lucide-react'
import { Button, Badge, ScrollReveal } from '@/components/atoms'
import MovieNightIllustration from '@/assets/landing/movie-night-rafiki.svg'

interface HeroSectionProps {
  totalTitles?: number
  featuredTitle?: string
  featuredDescription?: string
  featuredGenre?: string
  featuredYear?: number
  featuredRecommendation?: number | null
  featuredBackdropUrl?: string
}

export function HeroSection({
  totalTitles = 0,
  featuredTitle,
  featuredDescription,
  featuredGenre,
  featuredYear,
  featuredRecommendation = null,
  featuredBackdropUrl,
}: HeroSectionProps) {
  const titleCountLabel =
    totalTitles > 0 ? `${totalTitles.toLocaleString('es-GT')} titulos disponibles` : 'Catalogo en actualizacion'

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080c14]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(26,95,180,0.45) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 45% 35% at 90% 100%, rgba(40,120,207,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-denim-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-denim-300) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
            <ScrollReveal variant="fade-down" delay={0} threshold={0}>
              <Badge
                variant="info"
                className="gap-1.5 border border-[var(--color-denim-700)] bg-[var(--color-denim-950)]/70 px-4 py-1.5 text-sm text-[var(--color-denim-200)] backdrop-blur-sm"
              >
                <Sparkles size={13} className="text-[var(--color-denim-300)]" />
                {titleCountLabel}
              </Badge>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={100} threshold={0}>
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                El cine en la palma{' '}
                <span
                  className="bg-clip-text text-transparent"
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
              <p className="max-w-xl text-lg leading-relaxed text-[var(--color-denim-300)] sm:text-xl">
                {featuredDescription ||
                  'Accede a peliculas y series en alta definicion. Sin anuncios, sin interrupciones. Disfruta donde quieras, cuando quieras.'}
              </p>
            </ScrollReveal>

            {featuredTitle ? (
              <ScrollReveal variant="fade-up" delay={260} threshold={0}>
                <div className="max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 backdrop-blur-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-denim-400)]">
                    Destacado del catalogo
                  </p>
                  <p className="text-base font-semibold text-white">{featuredTitle}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-denim-300)]">
                    {featuredGenre ? <span>{featuredGenre}</span> : null}
                    {featuredYear ? <span>{featuredYear}</span> : null}
                    {featuredRecommendation != null ? (
                      <span className="flex items-center gap-1 text-[var(--color-warning)]">
                        <ThumbsUp size={12} fill="currentColor" strokeWidth={0} />
                        {Math.round(featuredRecommendation * 10)}% de aprobacion
                      </span>
                    ) : (
                      <span>Sin recomendacion disponible</span>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            ) : null}

            <ScrollReveal variant="fade-up" delay={300} threshold={0}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/register">
                  <Button
                    variant="primary"
                    size="lg"
                    className="shadow-lg shadow-[var(--color-denim-700)]/40"
                  >
                    <PlayCircle size={18} />
                    Empezar ahora
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Iniciar sesion
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fade" delay={450} threshold={0}>
              <div className="flex flex-col items-center gap-5 pt-2 text-sm text-[var(--color-denim-400)] sm:flex-row">
                {['Sin tarjeta de credito', 'Cancela cuando quieras', 'HD y 4K'].map((text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-[var(--color-success)]" />
                    {text}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal variant="fade-left" delay={200} threshold={0}>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--color-denim-500)]/20 to-transparent blur-2xl" />
              {featuredBackdropUrl ? (
                <img
                  src={featuredBackdropUrl}
                  alt={featuredTitle || 'Contenido destacado'}
                  className="relative mx-auto aspect-[4/5] w-full max-w-md rounded-[2rem] object-cover drop-shadow-2xl"
                />
              ) : (
                <img
                  src={MovieNightIllustration}
                  alt="Personas disfrutando peliculas"
                  className="relative mx-auto w-full max-w-lg drop-shadow-2xl"
                />
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
