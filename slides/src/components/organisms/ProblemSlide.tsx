import { AlertTriangle, Boxes, Database, Gauge, LockKeyhole, Waypoints } from 'lucide-react'
import { GlassCard } from '../atoms/GlassCard'
import { MetricPill } from '../atoms/MetricPill'
import { SlideHeader } from '../molecules/SlideHeader'

export function ProblemSlide() {
  return (
    <section className="slide-canvas content-slide" aria-label="Problema inicial">
      <div className="slide-sheen" />
      <div className="slide-frame content-frame">
        <SlideHeader
          eyebrow="01 Diagnostico"
          title="El monolito dejo de encajar con Quetzal TV"
          summary="La aplicacion paso de CRUD y catalogo a una plataforma con streaming, pagos, recomendaciones, auditoria, sesiones, watch party y operaciones cloud."
          icon={AlertTriangle}
        />
        <div className="diagnosis-grid">
          <div className="monolith-panel">
            <span className="panel-label">Situacion inicial</span>
            <h3>Una sola unidad para dominios con ritmos distintos</h3>
            <p>
              Usuarios, suscripciones, catalogo, streaming, cobros, divisas y notificaciones
              concentraban responsabilidades que requieren escalado, datos y fallos independientes.
            </p>
            <div className="monolith-stack" aria-label="Representacion monolitica">
              <span>UI</span>
              <span>API</span>
              <span>Negocio</span>
              <span>Datos</span>
            </div>
          </div>
          <div className="card-grid">
            <GlassCard
              title="Cuello de botella operativo"
              body="Cada cambio obligaba a reconstruir y desplegar una unidad completa, incluso si solo cambiaba cobros o catalogo."
              icon={Boxes}
            />
            <GlassCard
              title="Persistencia acoplada"
              body="Una base compartida aumenta dependencia entre equipos y dificulta auditar cambios por dominio."
              icon={Database}
              accent="aqua"
            />
            <GlassCard
              title="Escalado ineficiente"
              body="Streaming y catalogo tienen carga de lectura distinta a usuarios o notificaciones; escalar todo junto desperdicia recursos."
              icon={Gauge}
              accent="violet"
            />
            <GlassCard
              title="Superficie de riesgo"
              body="Exponer servicios y datos juntos complica aislar errores, aplicar reglas JWT y proteger redes internas."
              icon={LockKeyhole}
            />
          </div>
        </div>
        <div className="bottom-strip">
          <MetricPill value="7" label="dominios con base propia" />
          <MetricPill value="gRPC" label="contratos internos tipados" />
          <MetricPill value="VPC" label="comunicacion privada" />
          <div className="strip-note">
            <Waypoints size={18} />
            <span>La justificacion del cambio fue separar responsabilidades para desplegar, observar y recuperar por dominio.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
