import { SlideKicker } from '../atoms/SlideKicker'
import { SlideMeta } from '../molecules/SlideMeta'

export function LuxuryIntroSlide() {
  return (
    <section className="slide-canvas" aria-label="Diapositiva inicial">
      <div className="slide-sheen" />
      <div className="slide-frame">
        <SlideMeta />
        <div className="slide-content">
          <SlideKicker>Arquitectura de Software</SlideKicker>
          <h1>Observabilidad</h1>
          <p className="slide-subtitle">
            Una plantilla visual elegante para presentar sistemas, telemetria y decisiones tecnicas
            con una narrativa clara.
          </p>
        </div>
        <div className="slide-signature">
          <span>SA Proyecto G10</span>
          <span>2026</span>
        </div>
      </div>
    </section>
  )
}
