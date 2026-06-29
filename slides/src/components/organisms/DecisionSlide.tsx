import {
  Braces,
  CloudCog,
  DatabaseZap,
  GitBranch,
  KeyRound,
  Radar,
  ServerCog,
  Workflow,
} from 'lucide-react'
import { DetailCard, GlassCard } from '../atoms/GlassCard'
import { SlideHeader } from '../molecules/SlideHeader'

export function DecisionSlide() {
  return (
    <section className="slide-canvas content-slide" aria-label="Planteamiento de la solucion">
      <div className="slide-sheen" />
      <div className="slide-frame content-frame">
        <SlideHeader
          eyebrow="02 Toma de decisiones"
          title="Seleccion tecnica por dominio, no por preferencia"
          summary="La arquitectura se eligio comparando responsabilidad, tipo de carga, aislamiento de datos, despliegue y capacidad de observacion."
          icon={Workflow}
        />
        <div className="decision-layout">
          <DetailCard>
            <h3>Matriz poliglota</h3>
            <div className="language-matrix">
              <span>Python</span>
              <p>Usuarios y suscripcion: validaciones, JWT, perfiles y reglas de negocio con FastAPI/Pydantic.</p>
              <span>Go</span>
              <p>Catalogo y streaming: lectura intensa, concurrencia, binarios ligeros y tiempos predecibles.</p>
              <span>TypeScript</span>
              <p>Frontend, API Gateway, cobros, divisas y notificaciones: contratos tipados e integraciones I/O.</p>
            </div>
          </DetailCard>
          <div className="decision-cards">
            <GlassCard
              title="Bases externas"
              body="PostgreSQL queda fuera de Kubernetes en VM dedicada; cada microservicio conserva su base y auditoria."
              icon={DatabaseZap}
              accent="aqua"
            />
            <GlassCard
              title="Sesion y seguridad"
              body="JWT Bearer validado en API Gateway, claims de rol/sesion y secretos separados en GitHub/Kubernetes."
              icon={KeyRound}
            />
            <GlassCard
              title="IaC declarativo"
              body="Terraform crea VPC, firewalls, GKE, VMs, buckets, IAM y Artifact Registry con estado remoto en GCS."
              icon={CloudCog}
              accent="violet"
            />
            <GlassCard
              title="Configuracion reproducible"
              body="Ansible prepara VMs por SSH, instala Docker, levanta PostgreSQL, servicios y node_exporter sin pasos manuales."
              icon={ServerCog}
            />
          </div>
        </div>
        <div className="comparison-ribbon">
          <div>
            <Braces size={18} />
            <span>Protocol Buffers reducen ambiguedad entre lenguajes.</span>
          </div>
          <div>
            <Radar size={18} />
            <span>ELK explica eventos; Prometheus y Grafana explican salud.</span>
          </div>
          <div>
            <GitBranch size={18} />
            <span>GitHub Actions corta el pipeline si pruebas o cobertura fallan.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
