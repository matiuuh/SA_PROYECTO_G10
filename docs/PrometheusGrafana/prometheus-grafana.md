# Prometheus y Grafana
## Observabilidad de métricas


## Índice

1. [Prometheus](#1-prometheus)
2. [Grafana](#2-grafana)
3. [Arquitectura del stack de métricas](#3-arquitectura-del-stack-de-métricas)
4. [Componentes desplegados](#4-componentes-desplegados)
5. [Configuración paso a paso](#5-configuración-paso-a-paso)
6. [Validación del monitoreo](#6-validación-del-monitoreo)
7. [Dashboard inicial y métricas visibles](#7-dashboard-inicial-y-métricas-visibles)
8. [Métricas](#8-métricas)

---

## 1. Prometheus

### ¿Qué es?

**Prometheus** es un sistema de monitoreo basado en series temporales. Su modelo de trabajo consiste en recolectar métricas de forma activa mediante **scraping**, es decir, haciendo peticiones HTTP periódicas a componentes que exponen métricas en formato Prometheus.

### ¿Por qué se usa?

Se usa porque permite centralizar métricas operativas en un solo punto, consultar información histórica mediante PromQL y adaptarse bien a entornos híbridos, como el de Quetzal TV, donde hay componentes dentro de Kubernetes y también servidores externos como VM3.

### ¿Para qué se usa en Quetzal TV?

En este proyecto, Prometheus se usa para recolectar métricas de:

- la propia instancia de Prometheus
- los nodos del clúster GKE mediante `node-exporter`
- la VM3 externa mediante `node_exporter`
- el estado del clúster y de los workloads mediante `kube-state-metrics`
- pods y servicios anotados si en el futuro se exponen endpoints `/metrics`

Su propósito dentro de Quetzal TV es consolidar la telemetría de infraestructura y de plataforma necesaria para cumplir con el monitoreo de hardware y red solicitado en el enunciado.

---

## 2. Grafana

### ¿Qué es?

**Grafana** es la herramienta de visualización del stack. No recolecta métricas directamente; en su lugar, consulta a Prometheus como **datasource** y presenta la información en dashboards interactivos.

### ¿Por qué se usa?

Se usa porque convierte consultas técnicas en paneles comprensibles y navegables, facilitando el monitoreo en tiempo real. También permite tener en una sola interfaz el estado de la VM externa, de los nodos del clúster y de los workloads del sistema.

### ¿Para qué se usa en Quetzal TV?

En Quetzal TV, Grafana se usa para mostrar en vivo:

- CPU, memoria, disco y red
- estado de nodos GKE
- estado de pods y deployments
- reinicios acumulados
- disponibilidad general del stack de monitoreo

Su función dentro del proyecto es ofrecer la visualización centralizada que exige el enunciado, por medio de dashboards que reflejan la telemetría viva del entorno `release`.

---

## 3. Arquitectura del stack de métricas

### Modelo de funcionamiento del stack


Prometheus recolecta, almacena y responde consultas. Grafana consume esas consultas para construir paneles y dashboards.

### Alcance del monitoreo

Este stack cubre la parte del enunciado orientada a:

- métricas de **hardware**
- métricas de **red**
- visualización centralizada en dashboards

No está orientado a métricas de negocio. Es decir, no mide todavía conversiones, reproducciones, pagos exitosos o comportamiento funcional del producto.

---

## 4. Componentes desplegados

### Prometheus

- Vive en `quetzaltv-monitoring`
- Tipo: `Deployment`
- Service: `ClusterIP`
- Puerto: `9090`
- Configuración principal: `k8s/14-prometheus.yaml`

### Grafana

- Vive en `quetzaltv-monitoring`
- Tipo: `Deployment`
- Service: `ClusterIP`
- Ingress dedicado: `grafana-ingress`
- Puerto interno: `3000`
- Datasource por defecto: Prometheus

### node-exporter en GKE

- Vive en `quetzaltv-monitoring`
- Tipo: `DaemonSet`
- Un pod por nodo del clúster
- Service: headless service `node-exporter`
- Puerto: `9100`

Su objetivo es exponer métricas del sistema operativo de cada nodo GKE:

- CPU
- memoria
- disco
- red

### node_exporter en VM3

- Vive fuera de Kubernetes, dentro de la VM3
- Instalado con Ansible mediante `ansible/playbooks/monitoring_vm3.yml`
- Corre como servicio `systemd`
- Puerto: `9100`

Su objetivo es exponer métricas de la VM externa donde viven las bases PostgreSQL.

### kube-state-metrics

- Vive en `quetzaltv-monitoring`
- Tipo: `Deployment`
- Service: `ClusterIP`
- Puerto: `8080`

No mide hardware. Mide el estado lógico del clúster, por ejemplo:

- pods running / pending / failed
- nodos ready
- deployments y réplicas disponibles
- reinicios acumulados

---

## 5. Configuración paso a paso

### Prerrequisitos

Antes del despliegue de `release`, debe existir lo siguiente:

1. **Infraestructura GCP creada** con Terraform
2. **VM3 configurada** con Ansible
3. `node_exporter` de VM3 funcionando
4. secretos de GitHub configurados para el workflow de `release`

### Archivos involucrados

| Archivo | Responsabilidad |
| --- | --- |
| `k8s/14-prometheus.yaml` | despliegue de Prometheus, RBAC y jobs de scrape |
| `k8s/15-grafana.yaml` | despliegue de Grafana, datasource e ingress |
| `k8s/16-prometheus-vm-targets.yaml` | targets externos por `file_sd` para VM3 |
| `k8s/17-grafana-dashboards.yaml` | dashboard provisionado automáticamente |
| `k8s/18-kube-state-metrics.yaml` | métricas de estado del clúster |
| `k8s/19-node-exporter.yaml` | métricas de hardware/red en nodos GKE |
| `ansible/playbooks/monitoring_vm3.yml` | instalación segura de `node_exporter` en VM3 |

### Variables y secretos necesarios

En GitHub Actions deben existir al menos:

- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `VM3_INTERNAL_IP`
- `GCP_PROJECT_ID`
- `AR_REGION`
- `GKE_CLUSTER`
- `GKE_ZONE`
- `GCP_SA_KEY`

### Despliegue por CI/CD

El workflow `cd-release.yml` realiza estas acciones:

1. obtiene credenciales del clúster GKE
2. sustituye variables en manifiestos con `envsubst`
3. crea el namespace `quetzaltv-monitoring` si no existe
4. crea el secret `grafana-admin`
5. aplica los manifiestos de Prometheus, Grafana, `kube-state-metrics` y `node-exporter`
6. espera los rollouts y falla si algún deployment no queda saludable

### Despliegue manual (solo para soporte o verificación)

```bash
kubectl apply -f k8s/14-prometheus.yaml
kubectl apply -f k8s/15-grafana.yaml
kubectl apply -f k8s/16-prometheus-vm-targets.yaml
kubectl apply -f k8s/17-grafana-dashboards.yaml
kubectl apply -f k8s/18-kube-state-metrics.yaml
kubectl apply -f k8s/19-node-exporter.yaml
```

---

## 6. Validación del monitoreo

### Verificar pods del namespace de monitoreo

```bash
kubectl get pods -n quetzaltv-monitoring -o wide
```

Salida esperada aproximada:

```text
NAME                                 READY   STATUS    RESTARTS   AGE
grafana-xxxxxxxxxx-xxxxx             1/1     Running   0          5m
kube-state-metrics-xxxxxxxxxx-xxxxx  1/1     Running   0          5m
node-exporter-xxxxx                  1/1     Running   0          5m
node-exporter-yyyyy                  1/1     Running   0          5m
prometheus-xxxxxxxxxx-xxxxx          2/2     Running   0          5m
```

### Verificar servicios

```bash
kubectl get svc -n quetzaltv-monitoring
```

Deben existir al menos:

- `prometheus`
- `grafana`
- `kube-state-metrics`
- `node-exporter`

### Verificar ingress de Grafana

```bash
kubectl get ingress grafana-ingress -n quetzaltv-monitoring
```

Salida esperada:

```text
NAME              ADDRESS          PORTS
grafana-ingress   X.X.X.X          80
```

Luego se accede vía:

```text
http://<IP_DEL_INGRESS>
```

### Verificar targets en Prometheus

Si no se expone Prometheus públicamente, se puede usar:

```bash
kubectl port-forward -n quetzaltv-monitoring svc/prometheus 9090:9090
```

Y luego abrir:

```text
http://localhost:9090/targets
```

Los targets que deberían aparecer `UP` son:

- `prometheus`
- `node-exporter` de VM3
- `node-exporter` de nodos GKE
- `kube-state-metrics`

### Verificar exporter de VM3

```bash
curl http://10.0.0.4:9100/metrics
```

Si responde texto con métricas Prometheus, el exporter está funcionando correctamente.

---

## 7. Dashboard inicial y métricas visibles

Grafana provisiona automáticamente el dashboard:

- `Release Infra Overview`

### Métricas visibles en el dashboard

- CPU usada (%)
- memoria usada (%)
- disco raíz usado (%)
- uptime del host
- tráfico de red RX/TX
- uso de CPU en el tiempo
- uso de disco en el tiempo
- nodos monitoreados
- nodos listos
- pods corriendo
- reinicios acumulados
- réplicas disponibles
- estado del exporter de VM3
- estado de Prometheus

---

## 8. Métricas

Las siguientes capturas corresponden al dashboard de Grafana ya conectado a Prometheus y reflejando métricas vivas del entorno `release`.

### Vista general del dashboard

![Vista general de métricas](./metrica1.jpg)

Esta captura muestra los paneles principales de infraestructura, incluyendo CPU, memoria, disco raíz, uptime y tráfico de red.

### Métricas de infraestructura y estado del stack

![Métricas de infraestructura](./metrica2.jpg)

En esta vista se observa el comportamiento temporal de CPU y disco, junto con el estado del exporter de VM3 y de la instancia de Prometheus.

### Métricas del clúster y workloads

![Métricas del clúster](./metrica3.jpg)

Esta sección refleja métricas del clúster, como nodos monitoreados, nodos listos, pods corriendo, reinicios acumulados y réplicas disponibles.

---


[Volver a la documentación](../Documentación.md)
