import { Activity, BrainCircuit, Cloud, Container, Database, Globe2, ShieldCheck } from 'lucide-react'
import { MetricPill } from '../atoms/MetricPill'
import { ArchitectureNode } from '../molecules/ArchitectureNode'
import { SlideHeader } from '../molecules/SlideHeader'

export function SolutionSlide() {
  return (
    <section className="slide-canvas content-slide" aria-label="Solucion final">
      <div className="slide-sheen" />
      <div className="slide-frame content-frame">
        <SlideHeader
          eyebrow="03 Ecosistema final"
          title="Infraestructura elastica con backend inteligente"
          summary="El resultado unifica GKE, Compute Engine, bases externas, pipeline, observabilidad y servicios especializados para sostener disponibilidad y evolucion."
          icon={ShieldCheck}
        />
        <div className="ecosystem-flow" aria-label="Flujo de arquitectura final">
          <ArchitectureNode title="Usuarios" detail="Frontend React" icon={Globe2} />
          <ArchitectureNode title="Entrada unica" detail="Ingress + API Gateway" icon={ShieldCheck} />
          <ArchitectureNode title="Release" detail="GKE + RollingUpdate" icon={Container} />
          <ArchitectureNode title="Datos" detail="7 PostgreSQL externos + Redis" icon={Database} />
          <ArchitectureNode title="Operaciones" detail="ELK + Prometheus + Grafana" icon={Activity} />
        </div>
        <div className="solution-grid">
          <div className="intelligence-panel">
            <BrainCircuit size={34} strokeWidth={1.6} />
            <h3>Backend inteligente</h3>
            <p>
              Streaming calcula recomendaciones por contenido usando historial, progreso,
              likes/dislikes, generos y popularidad; catalogo aporta metadatos sin romper autonomia.
            </p>
          </div>
          <div className="availability-panel">
            <Cloud size={34} strokeWidth={1.6} />
            <h3>Disponibilidad operativa</h3>
            <p>
              GKE aporta recuperacion de pods, readiness/liveness probes, rollback y despliegues
              progresivos; las bases quedan persistentes fuera del ciclo efimero del cluster.
            </p>
          </div>
        </div>
        <div className="bottom-strip">
          <MetricPill value="9" label="imagenes versionadas" />
          <MetricPill value="75%" label="cobertura minima CI" />
          <MetricPill value="50" label="usuarios simulados Locust" />
          <MetricPill value="0" label="fallos esperados en smoke/carga" />
        </div>
      </div>
    </section>
  )
}
