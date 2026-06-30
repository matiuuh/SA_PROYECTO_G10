import { useMemo, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  CloudCog,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { LuxuryIntroSlide } from '../organisms/LuxuryIntroSlide'
import { PresenterSlide } from '../organisms/PresenterSlide'
import { SlidesStage } from '../templates/SlidesStage'

export function SlidesApp() {
  const slides = useMemo(
    () => [
      <LuxuryIntroSlide />,
      <PresenterSlide
        presenter="Pablo Sosof"
        role="Arquitecto de diagnostico"
        title="El problema inicial"
        lead="Diagnostico de por que Quetxal TV necesitaba abandonar una vision monolitica para operar como plataforma de streaming."
        icon={Network}
        points={[
          'Un monolito concentra interfaz, reglas, streaming, pagos, sesiones y datos en una sola unidad de despliegue.',
          'Los cuellos de botella aparecen en escalado horizontal, despliegues completos, base de datos unica y latencia entre dominios.',
          'Los modulos de negocio crecieron por fases: cuentas, perfiles, catalogo, pagos, divisas, streaming, observabilidad y automatizacion.',
          'La justificacion del cambio fue separar dominios en microservicios poliglotas comunicados por contratos gRPC.',
        ]}
        highlights={[
          { value: '7', label: 'dominios de negocio' },
          { value: 'gRPC', label: 'comunicacion interna' },
          { value: 'F1-F3', label: 'evolucion funcional' },
        ]}
        techLogos={[
          { name: 'gRPC', slug: 'grpc', color: 'FFFFFF' },
          { name: 'Docker', slug: 'docker', color: '2496ED' },
          { name: 'PostgreSQL', slug: 'postgresql', color: '4169E1' },
        ]}
      />,
      <PresenterSlide
        presenter="Daniel Hernandez"
        role="Arquitecto de stack y seguridad"
        title="Decisiones arquitectonicas"
        lead="Seleccion del stack, contratos internos, esquemas de sesion, datos externos y gobierno de codigo."
        icon={ShieldCheck}
        points={[
          'Go se asigna a streaming por concurrencia y respuesta predecible; TypeScript al API Gateway y FX por I/O tipado; Python a reglas, automatizacion e inteligencia.',
          'gRPC y Protocol Buffers se eligieron frente a REST interno por contratos tipados, menor ambiguedad y compatibilidad poliglota.',
          'La seguridad combina JWT para identidad y autorizacion, cookies de sesion en cliente y compatibilidad conceptual con OAuth para integraciones.',
          'PostgreSQL queda fuera del cluster de Kubernetes por persistencia; Redis acelera consultas repetitivas de divisas mediante cache con TTL.',
          'SOLID y gobierno de codigo se sostienen con separacion de responsabilidades, puertos/adaptadores, Pull Requests y ramas por entorno.',
        ]}
        highlights={[
          { value: 'Go', label: 'streaming/catalogo' },
          { value: 'TS', label: 'gateway e integraciones' },
          { value: 'Python', label: 'reglas e inteligencia' },
        ]}
        techLogos={[
          { name: 'Go', slug: 'go', color: '00ADD8' },
          { name: 'TypeScript', slug: 'typescript', color: '3178C6' },
          { name: 'Python', slug: 'python', color: 'FFD43B' },
          { name: 'Redis', slug: 'redis', color: 'FF4438' },
        ]}
      />,
      <PresenterSlide
        presenter="Mateo Noriega"
        role="Ingeniero IaC y CI/CD"
        title="Infraestructura como codigo"
        lead="Automatizacion reproducible desde provisionamiento cloud hasta despliegue progresivo y rollback."
        icon={CloudCog}
        points={[
          'Terraform declara VPC, subredes, firewalls, GKE, Compute Engine, buckets, IAM y Artifact Registry.',
          'Ansible automatiza de forma agentless las dependencias, Docker, variables, bases de datos y servicios en VMs.',
          'GitHub Actions aplica cortocircuito critico: pruebas, cobertura minima del 75%, build, backup, despliegue y smoke tests.',
          'La estrategia multi-rama separa develop en Compute Engine y release en GKE con rollout verificado y rollback.',
          'Kubernetes organiza namespaces, ConfigMaps, Secrets, Ingress, Services y probes de liveness/readiness.',
        ]}
        highlights={[
          { value: 'IaC', label: 'infraestructura declarativa' },
          { value: '75%', label: 'cobertura minima' },
          { value: 'GKE', label: 'release elastico' },
        ]}
        techLogos={[
          { name: 'Terraform', slug: 'terraform', color: '844FBA' },
          { name: 'Ansible', slug: 'ansible', color: 'EE0000' },
          { name: 'GitHub Actions', slug: 'githubactions', color: '2088FF' },
          { name: 'Kubernetes', slug: 'kubernetes', color: '326CE5' },
        ]}
      />,
      <PresenterSlide
        presenter="Juan Chacon"
        role="Ingeniero de observabilidad"
        title="Observabilidad y pruebas"
        lead="Capacidad de ver logs, metricas, carga y nuevas reglas de negocio antes de que afecten la experiencia del usuario."
        icon={Activity}
        points={[
          'ELK centraliza logs de auditoria con Elasticsearch, Logstash y Kibana para filtrar por servicio, error o flujo.',
          'Prometheus recolecta metricas de pods, nodos y VM3; Grafana las presenta en dashboards operativos.',
          'Locust simula carga ligera en rutas criticas y genera reporte HTML con RPS, p95, p99 y tasa de fallos.',
          'El motor de recomendacion usa historial, calificaciones, generos y popularidad para construir "Recomendados para ti".',
          'Control parental con PIN de 4 digitos y CronJob de depuracion agregan reglas de seguridad y mantenimiento automatico.',
        ]}
        highlights={[
          { value: 'ELK', label: 'logs centralizados' },
          { value: 'Grafana', label: 'dashboards vivos' },
          { value: 'Locust', label: 'carga controlada' },
        ]}
        techLogos={[
          { name: 'Elasticsearch', slug: 'elasticsearch', color: '005571' },
          { name: 'Kibana', slug: 'kibana', color: '005571' },
          { name: 'Prometheus', slug: 'prometheus', color: 'E6522C' },
          { name: 'Grafana', slug: 'grafana', color: 'F46800' },
        ]}
      />,
      <PresenterSlide
        presenter="Estiben Lopez"
        role="Lider de demo y cierre"
        title="Solucion final y demo"
        lead="Demostracion del ecosistema unificado en GCP y cierre con disponibilidad, escalabilidad y replicabilidad."
        icon={BrainCircuit}
        points={[
          'Watch Party usa WebSockets y se restringe a usuarios premium para crear salas sincronizadas.',
          'La descarga cifrada local se controla por plan y conserva registros protegidos en el navegador.',
          'Los interceptores gRPC validan plan, rol y JWT antes de procesar peticiones sensibles.',
          'La demo recorre usuario, suscripcion, catalogo, reproduccion, recomendacion, pagos, observabilidad e infraestructura.',
          'La conclusion evidencia disponibilidad, escalabilidad, replicabilidad de la infraestructura y lecciones aprendidas.',
        ]}
        highlights={[
          { value: 'GCP', label: 'ecosistema unificado' },
          { value: 'JWT', label: 'validacion previa' },
          { value: '20 min', label: 'defensa completa' },
        ]}
        techLogos={[
          { name: 'Google Cloud', slug: 'googlecloud', color: '4285F4' },
          { name: 'WebSocket', slug: 'socketdotio', color: 'FFFFFF' },
          { name: 'JSON Web Tokens', slug: 'jsonwebtokens', color: 'FFFFFF' },
          { name: 'React', slug: 'react', color: '61DAFB' },
        ]}
      />,
    ],
    [],
  )
  const [currentIndex, setCurrentIndex] = useState(0)

  const goPrevious = () => setCurrentIndex((index) => Math.max(0, index - 1))
  const goNext = () => setCurrentIndex((index) => Math.min(slides.length - 1, index + 1))

  return (
    <SlidesStage
      currentIndex={currentIndex}
      totalSlides={slides.length}
      onPrevious={goPrevious}
      onNext={goNext}
      onSelect={setCurrentIndex}
    >
      <div className="slide-transition" key={currentIndex}>
        {slides[currentIndex]}
      </div>
    </SlidesStage>
  )
}
