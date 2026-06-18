--

## Infraestructura de Producción — Kubernetes / GKE

El entorno de producción de Quetzal TV se despliega sobre **Google Kubernetes Engine (GKE)**. Esta sección documenta y justifica cada decisión de arquitectura tomada para el despliegue de los componentes en el clúster.

---

### Deployments

**¿Qué?** Un `Deployment` es el objeto de Kubernetes que describe el estado deseado de un conjunto de pods: qué imagen ejecutar, cuántas réplicas mantener, cómo actualizar y qué recursos puede consumir cada pod.

**¿Por qué?** Porque Kubernetes reconcilia continuamente el estado real del clúster contra lo declarado en el Deployment; si un pod muere, el controlador lo recrea automáticamente sin intervención manual. Esto elimina la necesidad de supervisión humana ante fallos puntuales de contenedores.

**¿Para qué?** Para garantizar que los diez componentes del sistema (frontend, api-gateway, siete microservicios y Redis) siempre tengan al menos un pod activo en ejecución, manteniendo la disponibilidad del servicio incluso ante reinicios, fallos de nodo o actualizaciones.

#### Configuración práctica

Quetzal TV despliega diez Deployments independientes dentro del namespace `quetzaltv-prod`. Cada uno opera con `replicas: 1` porque el proyecto corre en GKE Autopilot con un nodo único y presupuesto de CPU/memoria acotado. El controlador garantiza que siempre exista exactamente un pod activo por componente; si el pod cae por OOM, crash u otro error, Kubernetes lo reemplaza usando la misma imagen ya descargada en el nodo.

Los límites y solicitudes de recursos están declarados explícitamente para que el scheduler de GKE Autopilot pueda asignar capacidad correctamente y evitar que un servicio con pico de carga afecte a los demás:

```yaml
resources:
  requests:
    cpu: 30m
    memory: 48Mi
  limits:
    cpu: 150m
    memory: 192Mi
```

#### Estructura base del manifiesto (sin credenciales)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <servicio>
  namespace: quetzaltv-prod
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: <servicio>
  template:
    metadata:
      labels:
        app: <servicio>
    spec:
      containers:
        - name: <servicio>
          image: <AR_REGISTRY>/<servicio>:<VERSION>
          ports:
            - containerPort: 8xxx   # HTTP REST
            - containerPort: 5xxx   # gRPC
          env:
            - name: VARIABLE_NO_SENSIBLE
              valueFrom:
                configMapKeyRef:
                  name: quetzaltv-config
                  key: VARIABLE_NO_SENSIBLE
            - name: VARIABLE_SENSIBLE
              valueFrom:
                secretKeyRef:
                  name: quetzaltv-secrets
                  key: VARIABLE_SENSIBLE
          resources:
            requests:
              cpu: 30m
              memory: 48Mi
            limits:
              cpu: 150m
              memory: 192Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8xxx
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8xxx
            initialDelaySeconds: 5
            periodSeconds: 10
```

---

### Services (ClusterIP vs. NodePort vs. LoadBalancer)

**¿Qué?** Un `Service` de Kubernetes es una abstracción de red estable que asigna una IP y un nombre DNS fijos a un conjunto de pods dinámicos.

**¿Por qué?** Porque sin un Service, los pods no podrían comunicarse entre sí de forma fiable debido a que sus IPs cambian cada vez que son reemplazados. El Service actúa como un punto de contacto estable independiente del ciclo de vida de los pods.

**¿Para qué?** Para permitir que los componentes del sistema se comuniquen entre sí usando nombres DNS estables en lugar de IPs efímeras, facilitando la conectividad interna y el descubrimiento de servicios.

#### Tipos de Service disponibles

| Tipo | Alcance | Uso típico |
|---|---|---|
| `ClusterIP` | Solo interno al clúster | Comunicación entre microservicios |
| `NodePort` | Expone un puerto en cada nodo del clúster | Acceso externo directo al nodo (no recomendado en producción) |
| `LoadBalancer` | Provisiona un balanceador de carga externo del proveedor cloud | Exponer un servicio individualmente al exterior |

#### Decisión de diseño para Quetzal TV

Todos los Services de Quetzal TV son `ClusterIP` (tipo por defecto cuando no se especifica). Ningún microservicio se expone directamente al exterior; el único punto de entrada externo es el recurso `Ingress`, que dirige todo el tráfico al `api-gateway`. Esta decisión responde a dos razones:

1. **Seguridad:** los microservicios de negocio (usuario, catalogo, streaming, etc.) nunca reciben peticiones externas sin pasar por la validación JWT del api-gateway.
2. **Costo:** un `Service` de tipo `LoadBalancer` provisiona un balanceador de carga de GCP por cada servicio expuesto. Con diez componentes, eso representaría diez IPs externas y diez balanceadores facturables. El `Ingress` único con backend en el api-gateway cumple la misma función con un solo recurso.

Cada Service expone dos puertos para los microservicios que usan comunicación dual:

- Puerto `8xxx` para HTTP REST (consumido por el api-gateway y por llamadas inter-servicio vía HTTP).
- Puerto `5xxx` para gRPC (consumido por microservicios que se llaman entre sí con Protocol Buffers).

Redis expone únicamente el puerto `6379` porque ningún componente externo lo necesita y solo el servicio de Divisas lo consume internamente.

#### Estructura base del manifiesto

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <servicio>
  namespace: quetzaltv-prod
spec:
  selector:
    app: <servicio>        # empareja con el label del Deployment
  ports:
    - name: http
      port: 8xxx
      targetPort: 8xxx
    - name: grpc
      port: 5xxx
      targetPort: 5xxx
  # type: ClusterIP  ← omitido porque es el valor por defecto
```

El campo `selector` es el mecanismo de descubrimiento: Kubernetes mantiene una lista de Endpoints que apuntan a los pods cuyos labels coincidan con ese selector. Cuando el pod es reemplazado por una actualización, el nuevo pod hereda los mismos labels y el Service lo incorpora al Endpoint automáticamente, sin reconfiguración manual.

---

### ConfigMaps y Secrets

**¿Qué?** Son dos objetos de Kubernetes que permiten separar la configuración del contenedor:

- **ConfigMap:** almacena pares clave-valor no sensibles en texto plano.
- **Secret:** almacena datos sensibles codificados en Base64 y con acceso restringido por RBAC.

**¿Por qué?** Porque inyectar configuración a través de estos objetos en lugar de hardcodearla en la imagen o en el Dockerfile garantiza que la misma imagen sirva para distintos entornos simplemente cambiando el ConfigMap o el Secret, sin reconstruir el contenedor. Además, los Secrets pueden cifrarse en reposo con Cloud KMS en GKE.

**¿Para qué?** Para mantener la configuración no sensible (URLs internas, nombres de buckets) separada de las credenciales sensibles (contraseñas, claves JWT), facilitando la gestión de entornos y cumpliendo con prácticas de seguridad.

#### ConfigMap `quetzaltv-config`

Contiene toda la configuración no sensible compartida entre los pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quetzaltv-config
  namespace: quetzaltv-prod
data:
  DB_HOST: "<IP-VM3>"
  API_GATEWAY_URL: "http://api-gateway"
  FRONTEND_URL: "http://frontend:80"
  USUARIO_SERVICE_URL: "http://usuario-service:8001"
  SUSCRIPCION_SERVICE_URL: "http://suscripcion-service:8002"
  CATALOGO_SERVICE_URL: "http://catalogo-service:8003"
  STREAMING_SERVICE_URL: "http://streaming-service:8004"
  DIVISAS_SERVICE_URL: "http://divisas-service:8005"
  COBROS_SERVICE_URL: "http://cobros-service:8006"
  NOTIFICACIONES_SERVICE_URL: "http://notificaciones-service:8007"
  NOTIFICACIONES_GRPC_TARGET: "notificaciones-service:5007"
  SUBSCRIPCION_API_URL: "http://api-gateway/api/suscripcion"
  USUARIO_API_URL: "http://api-gateway/api/usuario"
  REDIS_URL: "redis://redis:6379"
  GCS_BUCKET: "quetzal-tv-streaming"
```

Las URLs de servicios internos usan el nombre DNS del Service (`usuario-service`, `catalogo-service`, etc.) en lugar de IPs. Kubernetes resuelve esos nombres automáticamente dentro del namespace, por lo que si un pod cambia de IP el resto no requiere ninguna actualización de configuración.

#### Secret `quetzaltv-secrets`

Almacena las credenciales sensibles. Es generado y aplicado por el pipeline de CD en cada despliegue a partir de los GitHub Secrets, sin que las credenciales aparezcan en el repositorio:

```yaml
# Estructura del Secret (valores omitidos — se inyectan desde GitHub Secrets en cd-release.yml)
apiVersion: v1
kind: Secret
metadata:
  name: quetzaltv-secrets
  namespace: quetzaltv-prod
type: Opaque
stringData:
  JWT_SECRET: "<valor-desde-github-secrets>"
  DB_PASSWORD: "<valor-desde-github-secrets>"
  DATABASE_URL_CATALOGO: "postgres://postgres:<password>@<VM3_HOST>:5433/quetzal_catalogo?sslmode=disable"
  DATABASE_URL_STREAMING: "postgres://postgres:<password>@<VM3_HOST>:5434/quetzal_streaming?sslmode=disable"
  DATABASE_URL_DIVISAS: "postgres://postgres:<password>@<VM3_HOST>:5435/quetzal_divisas?sslmode=disable"
  DATABASE_URL_COBROS: "postgres://postgres:<password>@<VM3_HOST>:5436/quetzal_cobros?sslmode=disable"
  DATABASE_URL_NOTIFICACIONES: "postgres://postgres:<password>@<VM3_HOST>:5439/quetzal_notificaciones?sslmode=disable"
  EMAIL_USER: "<valor-desde-github-secrets>"
  EMAIL_PASS: "<valor-desde-github-secrets>"
  EMAIL_FROM: "<valor-desde-github-secrets>"
```

Cada pod consume únicamente las claves que necesita mediante `secretKeyRef`, sin acceso al Secret completo:

```yaml
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: quetzaltv-secrets
        key: JWT_SECRET
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: quetzaltv-secrets
        key: DATABASE_URL_CATALOGO
```

Las cadenas de conexión a PostgreSQL incluyen la IP de VM3 (donde corren los siete contenedores de base de datos), el puerto diferenciado por servicio (5433–5439) y el nombre de la base correspondiente. Esto permite que los pods del clúster accedan a las bases de datos externas al clúster sin exponer las credenciales en ningún archivo del repositorio.

---

### Estrategia de Despliegue Zero-Downtime

**¿Qué?** Es una estrategia de actualización de aplicaciones donde el servicio no experimenta interrupciones visibles durante el despliegue de una nueva versión.

**¿Por qué?** Porque en producción, detener el servicio para actualizarlo genera indisponibilidad, afecta la experiencia del usuario y puede causar pérdida de transacciones o sesiones activas.

**¿Para qué?** Para permitir que Quetzal TV libere nuevas versiones del sistema sin que los usuarios perciban cortes ni errores de conexión durante el proceso.

#### RollingUpdate: Parámetros maxSurge y maxUnavailable

Todos los Deployments del clúster declaran explícitamente la estrategia `RollingUpdate`:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

**`maxUnavailable: 0`**

Define cuántos pods del Deployment pueden estar fuera de servicio simultáneamente durante una actualización. El valor `0` significa que en ningún momento se retira un pod de la versión anterior sin que ya exista un reemplazo en estado `Ready`. Formalmente, si el Deployment declara `replicas: 1`, Kubernetes garantiza que siempre haya al menos 1 pod activo respondiendo tráfico real durante todo el proceso de actualización.

**`maxSurge: 1`**

Define cuántos pods adicionales por encima del número de réplicas declaradas se pueden crear de forma temporal durante la actualización. Con `replicas: 1` y `maxSurge: 1`, Kubernetes puede levantar un segundo pod con la imagen nueva antes de terminar el primero con la imagen anterior. La capacidad total del Deployment sube transitoriamente a 2 pods, pero en cuanto el pod nuevo pasa sus Readiness Probes, el pod antiguo se termina y la capacidad vuelve a 1.

**Secuencia exacta para `replicas: 1`, `maxUnavailable: 0`, `maxSurge: 1`:**

1. Kubernetes crea un pod nuevo con la imagen `v2.x.0` → capacidad temporal: 2 pods.
2. El pod nuevo atraviesa sus Readiness Probes.
3. Una vez declarado `Ready`, el Endpoint del Service incluye el pod nuevo y excluye el pod antiguo.
4. Kubernetes termina el pod antiguo con señal `SIGTERM` y periodo de gracia.
5. Capacidad final: 1 pod, imagen nueva, sin haber cortado el servicio en ningún momento.

Con esta configuración, un usuario reproduciendo contenido durante el despliegue recibe sus respuestas del pod antiguo mientras el nuevo arranca, y se migra automáticamente al pod nuevo sin recibir ningún error de conexión.

---

### Rollback Automático

**¿Qué?** Es un mecanismo de recuperación que revierte automáticamente un despliegue fallido a su versión anterior estable.

**¿Por qué?** Porque detectar que un despliegue falló no es suficiente en producción; es necesario restaurar el servicio lo más rápido posible para minimizar la indisponibilidad y el impacto al usuario final.

**¿Para qué?** Para aumentar la resiliencia del pipeline de producción, reduciendo el riesgo operativo asociado a despliegues defectuosos y garantizando que una versión problemática no permanezca activa más tiempo del necesario.

#### Flujo de detección y recuperación

El pipeline de CD (`cd-release.yml`) ejecuta el rollback sin intervención manual cuando detecta que la nueva versión no supera sus health checks dentro del tiempo límite.



`kubectl rollout undo` revierte el Deployment a su `ReplicaSet` anterior, que Kubernetes conserva en su historial. La imagen que se restaura es la última que estuvo en estado `Running` con sus probes pasadas, es decir, la versión estable previa al intento fallido.

---

### Monitoreo de Salud de la Aplicación (Health Checks)

**¿Qué?** Son sondas periódicas que Kubernetes evalúa para determinar el estado de salud de los contenedores. Se declaran dos tipos independientes en cada pod.

**¿Por qué?** Porque Kubernetes necesita mecanismos automáticos para detectar cuándo un contenedor dejó de funcionar correctamente (Liveness) y cuándo está listo para recibir tráfico real (Readiness), sin depender de supervisión manual.

**¿Para qué?** Para garantizar que solo los pods verdaderamente saludables reciban peticiones, y para reiniciar automáticamente aquellos que entren en estados irrecuperables, manteniendo la disponibilidad del sistema.

#### Liveness Probe

Determina si el proceso dentro del contenedor sigue siendo funcional. Si la sonda falla `failureThreshold` veces consecutivas, Kubernetes mata el contenedor y lo reinicia. Su propósito es recuperar automáticamente un servicio que entró en deadlock, loop infinito u otro estado irrecuperable sin necesidad de intervención manual.

#### Readiness Probe

Determina si el contenedor está listo para recibir tráfico real. Mientras la sonda no pase, el pod se excluye del Endpoint del Service y el Ingress no le envía peticiones. Su propósito es evitar que un pod que todavía está inicializando (cargando configuración, conectándose a la base de datos, compilando caché) reciba tráfico antes de estar operativo.

---

#### Configuración por servicio

**Microservicios HTTP (usuario, suscripcion, catalogo, streaming, cobros, divisas, notificaciones, api-gateway):**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <HTTP_PORT>
  initialDelaySeconds: 15
  periodSeconds: 20
  timeoutSeconds: 5
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /health
    port: <HTTP_PORT>
  initialDelaySeconds: 5
  periodSeconds: 10
```

- `initialDelaySeconds: 15` en liveness da margen al proceso para arrancar antes de que Kubernetes empiece a evaluarlo. La readiness arranca antes (`5s`) porque es aceptable que el pod aún no esté listo, pero no que ya esté muerto.
- `periodSeconds: 20` en liveness significa que una caída se detecta en máximo 20 segundos.
- `failureThreshold: 3` en liveness requiere 3 fallos consecutivos (60 segundos de inactividad total) antes de reiniciar, evitando reinicios por picos momentáneos de latencia.
- El endpoint `/health` de cada microservicio devuelve HTTP 200 cuando el servicio está operativo.

**Frontend (nginx sirviendo la SPA):**

```yaml
livenessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 10
  periodSeconds: 20
  timeoutSeconds: 5
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 10
```

El frontend no expone `/health`; nginx responde HTTP 200 en `/` cuando está sirviendo correctamente los archivos estáticos.

**Redis:**

```yaml
livenessProbe:
  exec:
    command: ["redis-cli", "ping"]
  initialDelaySeconds: 10
  periodSeconds: 20
readinessProbe:
  exec:
    command: ["redis-cli", "ping"]
  initialDelaySeconds: 5
  periodSeconds: 10
```

Redis no expone un endpoint HTTP, por lo que la sonda utiliza `exec` en lugar de `httpGet`. El comando `redis-cli ping` devuelve `PONG` cuando el servidor está operativo. Cualquier otro resultado o error de ejecución hace fallar la sonda.

---

[Volver a Documentación](../Documentación.md)
