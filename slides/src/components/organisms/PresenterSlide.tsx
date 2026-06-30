import type { ComponentType, CSSProperties } from 'react'
import type { LucideProps } from 'lucide-react'
import { IdCard, UserRound } from 'lucide-react'

type PresenterSlideProps = {
  presenter: string
  role: string
  title: string
  lead: string
  icon: ComponentType<LucideProps>
  points: string[]
  highlights: Array<{
    label: string
    value: string
  }>
  techLogos?: Array<{
    name: string
    slug: string
    color: string
  }>
}

export function PresenterSlide({
  presenter,
  role,
  title,
  lead,
  icon: Icon,
  points,
  highlights,
  techLogos = [],
}: PresenterSlideProps) {
  return (
    <section className="slide-canvas presenter-slide" aria-label={title}>
      <div className="slide-sheen" />
      <div className="slide-frame presenter-frame">
        <header className="presenter-header">
          <div className="presenter-mark">
            <Icon size={31} strokeWidth={1.65} />
          </div>
          <div>
            <h2>{title}</h2>
            <span>{lead}</span>
          </div>
        </header>

        <div className="presenter-layout">
          <aside className="speaker-card">
            <div className="speaker-avatar">
              <UserRound size={34} strokeWidth={1.65} />
            </div>
            <span className="speaker-label">Expositor</span>
            <strong>{presenter}</strong>
            <p>{role}</p>
            <div className="speaker-meta">
              <span>
                <IdCard size={16} />
                Defensa tecnica
              </span>
            </div>
            {techLogos.length > 0 && (
              <div className="tech-logo-grid" aria-label="Tecnologias relacionadas">
                {techLogos.map((logo) => (
                  <img
                    key={logo.slug}
                    src={`https://cdn.simpleicons.org/${logo.slug}/${logo.color}`}
                    alt={logo.name}
                    title={logo.name}
                  />
                ))}
              </div>
            )}
          </aside>

          <div className="talk-track">
            {points.map((point, index) => (
              <article
                className="talk-point"
                key={point}
                style={{ '--delay': `${index * 90}ms` } as CSSProperties}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{point}</p>
              </article>
            ))}
          </div>
        </div>

        <footer className="highlight-row">
          {highlights.map((highlight) => (
            <div className="highlight-tile" key={highlight.label}>
              <strong>{highlight.value}</strong>
              <span>{highlight.label}</span>
            </div>
          ))}
        </footer>
      </div>
    </section>
  )
}
