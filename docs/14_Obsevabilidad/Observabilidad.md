# Observabilidad con Prometheus y Grafana

## Índice

1. [Prometheus y Grafana — Qué son y cómo funcionan](#1-prometheus-y-grafana--qué-son-y-cómo-funcionan)
2. [Arquitectura de observabilidad declarada](#2-arquitectura-de-observabilidad-declarada)
3. [Configuración paso a paso](#3-configuración-paso-a-paso)
4. [Verificación de métricas y dashboards](#4-verificación-de-métricas-y-dashboards)

---

## 1. Prometheus y Grafana — Qué son y cómo funcionan

**Prometheus** es una herramienta de monitoreo basada en series temporales. Su trabajo principal es recolectar métricas desde distintos objetivos mediante HTTP, almacenarlas y permitir consultas con PromQL para conocer el estado del sistema.

**Grafana** es una herramienta de visualización. En este proyecto usa Prometheus como fuente de datos y presenta las métricas en dashboards para revisar nodos, pods, réplicas, reinicios, uso de CPU, memoria, disco y disponibilidad de servicios.

### Conceptos clave

- **Scrape**: Recolección periódica de métricas desde un endpoint.
- **Target**: Objetivo monitoreado por Prometheus.
- **Exporter**: Servicio que expone métricas en formato compatible con Prometheus.
- **node_exporter**: Exporter usado para obtener métricas de CPU, memoria, disco y red de nodos o VMs.
- **kube-state-metrics**: Componente que expone el estado de recursos de Kubernetes como pods, deployments y réplicas.
- **Datasource**: Fuente de datos configurada en Grafana. En este caso es Prometheus.
- **Dashboard**: Panel visual en Grafana que agrupa métricas relevantes.

---

## 2. Arquitectura de observabilidad declarada

La observabilidad del proyecto se despliega en el namespace separado `quetzaltv-monitoring`. Esto permite aislar Prometheus, Grafana y los exporters de los microservicios productivos que viven en `quetzaltv-prod`.

### Archivos principales

- **k8s/14-prometheus.yaml**: Crea el namespace de monitoreo, permisos RBAC, configuración de Prometheus, deployment y service interno.
- **k8s/15-grafana.yaml**: Declara Grafana, su datasource hacia Prometheus, el provider de dashboards, PVC, service e ingress.
- **k8s/16-prometheus-vm-targets.yaml**: Registra la VM3 como target externo usando `${VM3_INTERNAL_IP}:9100`.
- **k8s/17-grafana-dashboards.yaml**: Define el dashboard `Release Infra Overview` cargado automáticamente en Grafana.
- **k8s/18-kube-state-metrics.yaml**: Expone métricas de estado de Kubernetes.
- **k8s/19-node-exporter.yaml**: Despliega `node_exporter` como DaemonSet para monitorear nodos del clúster.
- **ansible/playbooks/monitoring_vm3.yml**: Instala `node_exporter` en VM3 como servicio de `systemd`.

### Flujo de métricas

1. Los servicios, pods, nodos y VM3 exponen métricas.
2. Prometheus consulta esos objetivos cada 30 segundos.
3. Las métricas se almacenan como series temporales.
4. Grafana consulta Prometheus con PromQL.
5. El dashboard muestra el estado de infraestructura de release.

---

## 3. Configuración paso a paso

#### Crear el namespace y Prometheus

```bash
kubectl apply -f k8s/14-prometheus.yaml
```

Este manifiesto crea `quetzaltv-monitoring`, configura el ServiceAccount `prometheus`, los permisos de descubrimiento y el archivo `prometheus.yml`.

Prometheus recolecta métricas de:

- el propio Prometheus en `localhost:9090`;
- servicios anotados en `quetzaltv-prod`;
- pods anotados en `quetzaltv-prod`;
- `node-exporter` dentro del namespace de monitoreo;
- `kube-state-metrics`;
- targets externos definidos por file discovery.

#### Configurar el target externo de VM3

Antes de aplicar el archivo, `${VM3_INTERNAL_IP}` debe reemplazarse por la IP interna real de VM3 obtenida desde Terraform:

```bash
terraform -chdir=terraform output vm3_internal_ip
```

Luego se aplica el target:

```bash
kubectl apply -f k8s/16-prometheus-vm-targets.yaml
```

VM3 expone métricas en el puerto `9100` mediante `node_exporter`.

#### Instalar node_exporter en VM3 con Ansible

```bash
cd ansible/
ansible-playbook playbooks/monitoring_vm3.yml
```

Este playbook:

1. crea el usuario de sistema `node_exporter`;
2. descarga `node_exporter` versión `1.8.2`;
3. instala el binario en `/usr/local/bin/node_exporter`;
4. crea el servicio `node_exporter.service`;
5. habilita y arranca el servicio en el puerto `9100`.

#### Desplegar kube-state-metrics y node-exporter en Kubernetes

```bash
kubectl apply -f k8s/18-kube-state-metrics.yaml
kubectl apply -f k8s/19-node-exporter.yaml
```

`kube-state-metrics` permite consultar estado de recursos de Kubernetes, mientras que `node-exporter` permite observar los nodos del clúster.

#### Desplegar dashboards y Grafana

```bash
kubectl apply -f k8s/17-grafana-dashboards.yaml
kubectl apply -f k8s/15-grafana.yaml
```

Grafana queda configurado automáticamente con:

- datasource `Prometheus`;
- URL interna `http://prometheus.quetzaltv-monitoring.svc.cluster.local:9090`;
- dashboard provider `release-infra`;
- dashboard `Release Infra Overview`;
- credenciales administrativas desde el secret `grafana-admin`.

---

## 4. Verificación de métricas y dashboards

#### Verificar pods de monitoreo

```bash
kubectl get pods -n quetzaltv-monitoring
```

Deben aparecer corriendo los pods de Prometheus, Grafana, `kube-state-metrics` y `node-exporter`.

#### Verificar servicios

```bash
kubectl get svc -n quetzaltv-monitoring
```

Deben existir los servicios internos:

| Servicio | Puerto | Función |
|---|---:|---|
| `prometheus` | 9090 | Almacenamiento y consulta de métricas |
| `grafana` | 3000 | Visualización de dashboards |
| `kube-state-metrics` | 8080 | Estado de recursos Kubernetes |
| `node-exporter` | 9100 | Métricas de nodos |

#### Verificar targets en Prometheus

```bash
kubectl port-forward -n quetzaltv-monitoring svc/prometheus 9090:9090
```

Luego abrir:

```text
http://localhost:9090/targets
```

Los targets esperados deben estar en estado `UP`, especialmente:

- `prometheus`;
- `quetzaltv-monitoring-node-exporter`;
- `quetzaltv-monitoring-kube-state-metrics`;
- `external-vms`, correspondiente a VM3.

#### Verificar Grafana

```bash
kubectl get ingress -n quetzaltv-monitoring grafana-ingress
```

Con la IP externa del ingress se accede a Grafana. El dashboard principal muestra el estado general de infraestructura:

![Dashboard general de Grafana](./img/WhatsApp%20Image%202026-06-28%20at%2021.29.55.jpeg)

En la vista de infraestructura se observan métricas principales como nodos monitoreados, nodos listos, pods corriendo, reinicios acumulados y réplicas disponibles.

![Métricas de VM3 en Grafana](./img/WhatsApp%20Image%202026-06-28%20at%2021.29.55%20%282%29.jpeg)

También se visualizan métricas específicas de VM3 como CPU, memoria, disco, tráfico de red y tiempo de actividad.

![Estado de exporters y Prometheus](./img/WhatsApp%20Image%202026-06-28%20at%2021.29.55%20%281%29.jpeg)

La sección inferior confirma que el exportador de VM3 y Prometheus se encuentran arriba, lo que indica que la recolección de métricas funciona correctamente.

---

[Volver a la documentacion](../Documentación.md)
