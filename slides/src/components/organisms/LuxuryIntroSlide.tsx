import { SlideKicker } from '../atoms/SlideKicker'

export function LuxuryIntroSlide() {
  const logos = [
    { name: 'React', slug: 'react', color: '61DAFB' },
    { name: 'Kubernetes', slug: 'kubernetes', color: '326CE5' },
    { name: 'Terraform', slug: 'terraform', color: '844FBA' },
    { name: 'Google Cloud', slug: 'googlecloud', color: '4285F4' },
    { name: 'Prometheus', slug: 'prometheus', color: 'E6522C' },
    { name: 'Grafana', slug: 'grafana', color: 'F46800' },
  ]

  return (
    <section className="slide-canvas" aria-label="Diapositiva inicial">
      <div className="slide-sheen" />
      <div className="cover-logo-cloud" aria-label="Stack principal">
        {logos.map((logo) => (
          <img
            key={logo.slug}
            src={`https://cdn.simpleicons.org/${logo.slug}/${logo.color}`}
            alt={logo.name}
            title={logo.name}
          />
        ))}
      </div>
      <div className="slide-frame">
        <span />
        <div className="slide-content">
          <SlideKicker>Defensa final - 20 minutos</SlideKicker>
          <h1>Quetxal TV</h1>
          <p className="slide-subtitle">
            Diagnostico, decisiones arquitectonicas, infraestructura como codigo,
            observabilidad y demostracion del ecosistema operativo en GCP.
          </p>
        </div>
        <div className="slide-signature">
          <span>SA Proyecto G10</span>
        </div>
      </div>
    </section>
  )
}
