import { useEffect, useState } from 'react'
import { HeroSection, FeaturesSection, CatalogSection, PricingSection } from '@/components/organisms'
import { listCatalogContent } from '@/lib/catalogo-api'
import { listActivePlans } from '@/lib/suscripcion-api'
import type { CatalogContent } from '@/types/catalog'
import type { SubscriptionPlan } from '@/types/subscription'

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

  return (
    <>
      <HeroSection totalTitles={catalog.length} />
      <FeaturesSection />
      <CatalogSection catalog={catalog} />
      <PricingSection plans={plans} />
    </>
  )
}
