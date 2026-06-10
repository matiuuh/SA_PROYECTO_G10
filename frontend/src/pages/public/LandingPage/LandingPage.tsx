import { useEffect, useMemo, useState } from 'react'
import { HeroSection, FeaturesSection, CatalogSection, PricingSection } from '@/components/organisms'
import { listCatalogContent } from '@/lib/catalogo-api'
import { listActivePlans } from '@/lib/suscripcion-api'
import type { CatalogContent } from '@/types/catalog'
import type { SubscriptionPlan } from '@/types/subscription'

function getReleaseYear(date?: string): number {
  if (!date) return new Date().getFullYear()
  const parsedYear = Number(date.slice(0, 4))
  return Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear
}

function getTypeLabel(type: string): string {
  return type === 'serie' ? 'Serie' : 'Pelicula'
}

export function LandingPage() {
  const [catalog, setCatalog] = useState<CatalogContent[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])

  useEffect(() => {
    async function loadLandingData() {
      try {
        const [catalogData, plansData] = await Promise.all([
          listCatalogContent(),
          listActivePlans(),
        ])
        setCatalog(catalogData)
        setPlans(plansData)
      } catch {
        // Keep landing page resilient if backend is temporarily unavailable.
      }
    }

    void loadLandingData()
  }, [])

  const featuredContent = useMemo(() => {
    const topContent = [...catalog].sort(
      (left, right) => right.porcentaje_recomendacion - left.porcentaje_recomendacion,
    )[0]

    if (!topContent) {
      return null
    }

    return {
      title: topContent.titulo,
      description: topContent.sinopsis || 'Disponible ahora en Quetzal TV.',
      genre: getTypeLabel(topContent.tipo),
      year: getReleaseYear(topContent.fecha_lanzamiento),
      recommendation:
        topContent.porcentaje_recomendacion > 0
          ? Math.max(0, Math.min(10, topContent.porcentaje_recomendacion / 10))
          : null,
      posterUrl: topContent.url_portada,
    }
  }, [catalog])

  return (
    <>
      <HeroSection
        totalTitles={catalog.length}
        featuredTitle={featuredContent?.title}
        featuredDescription={featuredContent?.description}
        featuredGenre={featuredContent?.genre}
        featuredYear={featuredContent?.year}
        featuredRecommendation={featuredContent?.recommendation ?? null}
        featuredBackdropUrl={featuredContent?.posterUrl}
      />
      <FeaturesSection />
      <CatalogSection catalog={catalog} />
      <PricingSection plans={plans} />
    </>
  )
}
