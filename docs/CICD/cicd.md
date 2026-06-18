# CI/CD — Integración y Entrega Continua

## Diagrama de flujo de CI/CD - Quetzal TV

![flujo](CI-CDP2.svg)

[Archivo Crudo](https://drive.google.com/file/d/1ro1_zcd-iqKpRUpsEjVMUB_VJoGTecpg/view?usp=sharing)

---

## Visión general del diseño

El sistema de CI/CD de **Quetzal TV** fue diseñado para separar claramente la **validación**, la **entrega continua en entorno de desarrollo** y la **entrega controlada a producción**. Para ello, el repositorio utiliza **tres workflows independientes de GitHub Actions**, cada uno con una responsabilidad concreta:

- **`ci.yml`**: ejecuta pruebas automatizadas y valida cobertura mínima en todos los servicios.
- **`cd-develop.yml`**: construye imágenes Docker, genera respaldos y despliega automáticamente en infraestructura de desarrollo sobre **Google Compute Engine (GCE)**.
- **`cd-release.yml`**: genera una nueva versión semántica, construye imágenes versionadas, realiza respaldo previo y despliega en **Google Kubernetes Engine (GKE)** con verificación y rollback automático.

Esta separación permite que cada etapa tenga reglas, dependencias y objetivos distintos. El resultado es un pipeline más seguro, más mantenible y más fácil de auditar.

---

## Justificación de herramientas

### GitHub Actions

**¿Qué?** Es la plataforma de automatización integrada en GitHub que ejecuta los workflows de integración y entrega continua definidos en el repositorio.

**¿Por qué?** Porque centraliza la automatización directamente junto al código fuente, evita depender de servidores externos dedicados para orquestar pipelines y permite reaccionar automáticamente a eventos del repositorio como `push` y `pull_request`. Además, ofrece integración nativa con secretos, runners administrados, jobs paralelos, matrices y un ecosistema amplio de acciones reutilizables.

**¿Para qué?** Para coordinar todo el ciclo de validación y despliegue del sistema: ejecutar pruebas, verificar cobertura, construir imágenes, publicar artefactos, respaldar bases de datos, desplegar en máquinas virtuales y desplegar en Kubernetes según la rama de trabajo.

---

### actions/checkout

**¿Qué?** Es la acción oficial de GitHub que clona el contenido del repositorio dentro del runner para que el workflow pueda operar sobre el código real del proyecto.

**¿Por qué?** Porque casi todos los jobs necesitan acceder a archivos del repositorio: código fuente, Dockerfiles, manifiestos de Kubernetes, archivos `requirements.txt`, `pnpm-lock.yaml`, composición Docker y configuración de despliegue. Sin este paso, el runner no tendría el contexto necesario para compilar, probar o desplegar.

**¿Para qué?** Para proporcionar a cada job una copia consistente del proyecto sobre la cual ejecutar pruebas, construir contenedores, calcular versiones, leer manifiestos o preparar despliegues remotos.

---

### actions/setup-python

**¿Qué?** Es la acción oficial de GitHub para instalar y configurar una versión específica de Python dentro del runner.

**¿Por qué?** Porque el pipeline valida microservicios desarrollados en Python y no se debe depender de la versión preinstalada en el runner. Además, permite habilitar caché de dependencias con `pip`, reduciendo tiempos de ejecución y mejorando la estabilidad del proceso de CI.

**¿Para qué?** Para asegurar que los servicios `usuario` y `suscripcion` se prueben siempre en un entorno Python homogéneo, reproducible y alineado con las dependencias definidas en sus respectivos `requirements.txt`.

---

### actions/setup-go

**¿Qué?** Es la acción oficial de GitHub para instalar y configurar una versión determinada del lenguaje Go en el runner.

**¿Por qué?** Porque los servicios `catalogo` y `streaming` están implementados en Go, y el pipeline necesita ejecutar pruebas unitarias y mediciones de cobertura sobre una versión concreta del compilador y del toolchain. También permite aprovechar caché basada en `go.sum`.

**¿Para qué?** Para garantizar que los tests de los servicios Go se ejecuten con una versión controlada del lenguaje, reduciendo diferencias entre entornos y haciendo confiable la validación de cobertura mínima.

---

### pnpm/action-setup

**¿Qué?** Es la acción oficial que instala y configura **pnpm** en el runner de GitHub Actions.

**¿Por qué?** Porque varios componentes del sistema están desarrollados en TypeScript y administran dependencias con `pnpm`, no con `npm`. Los runners no siempre incluyen `pnpm` listo para usar, por lo que esta acción garantiza una instalación explícita de la herramienta correcta.

**¿Para qué?** Para permitir que los servicios `cobros`, `divisas`, `notificaciones` y `api-gateway` ejecuten `pnpm install` y `pnpm test` de forma consistente dentro del pipeline de integración continua.

---

### actions/setup-node

**¿Qué?** Es la acción oficial de GitHub para instalar y configurar una versión específica de Node.js en el runner.

**¿Por qué?** Porque el proyecto incluye servicios y componentes que dependen del ecosistema de Node.js, y los runners de GitHub Actions pueden tener una versión distinta a la requerida por el repositorio. En este pipeline se fija explícitamente **Node.js 20**, lo que evita diferencias de comportamiento entre entornos, incompatibilidades con dependencias y fallos derivados de cambios de versión no controlados. Además, esta acción se integra con caché para `pnpm`, optimizando la instalación de dependencias.

**¿Para qué?** Para asegurar que la instalación, resolución de dependencias y ejecución de pruebas de los servicios TypeScript se realice siempre sobre una versión estable y conocida del runtime, manteniendo consistencia entre el entorno local del equipo y el entorno automatizado de CI/CD.

---

### actions/upload-artifact

**¿Qué?** Es una acción oficial de GitHub que permite almacenar archivos generados durante la ejecución de un job para consultarlos posteriormente.

**¿Por qué?** Porque los runners de GitHub Actions son efímeros: cuando termina un job, su sistema de archivos se descarta. Si no se publica la evidencia generada, se pierden reportes valiosos como resultados de cobertura o archivos de salida.

**¿Para qué?** Para conservar archivos como los reportes de cobertura generados durante CI, permitiendo auditoría, revisión posterior y evidencia del cumplimiento de los umbrales de calidad definidos en el pipeline.

---

### google-github-actions/auth

**¿Qué?** Es la acción oficial de Google para autenticar el runner de GitHub Actions contra servicios de Google Cloud usando una cuenta de servicio.

**¿Por qué?** Porque los workflows de entrega continua interactúan con múltiples servicios de GCP, como **Artifact Registry**, **Google Cloud Storage** y **Google Kubernetes Engine**. Sin autenticación explícita, el runner no tendría permisos para publicar imágenes, subir respaldos ni operar sobre el clúster.

**¿Para qué?** Para habilitar de forma segura el acceso automatizado a la infraestructura de Google Cloud durante la construcción, publicación, respaldo y despliegue de la plataforma.

---

### google-github-actions/get-gke-credentials

**¿Qué?** Es una acción oficial de Google que obtiene y configura en el runner las credenciales necesarias para administrar un clúster de **Google Kubernetes Engine** mediante `kubectl`.

**¿Por qué?** Porque el deploy de la rama `release` se realiza sobre Kubernetes, y para aplicar manifiestos, verificar rollouts o ejecutar rollback es indispensable establecer primero una conexión autenticada con el clúster.

**¿Para qué?** Para permitir que el workflow de producción se conecte al clúster GKE, aplique los manifiestos del directorio `k8s/`, verifique el estado del despliegue y pueda revertirlo automáticamente si ocurre una falla.

---

### docker/setup-buildx-action

**¿Qué?** Es una acción oficial para habilitar **Docker Buildx**, una extensión de Docker orientada a construcciones avanzadas de imágenes.

**¿Por qué?** Porque el proyecto construye múltiples imágenes Docker dentro del pipeline, y Buildx mejora el proceso mediante capacidades modernas de construcción y soporte de caché reutilizable entre ejecuciones.

**¿Para qué?** Para preparar el entorno del runner antes de construir y publicar las imágenes de los microservicios, del API Gateway y del frontend hacia Artifact Registry.

---

### docker/login-action

**¿Qué?** Es una acción oficial para autenticarse contra registros de contenedores desde GitHub Actions.

**¿Por qué?** Porque durante la construcción de imágenes es común descargar imágenes base desde Docker Hub, y autenticar el pipeline reduce el riesgo de limitaciones por rate limit, especialmente cuando se construyen muchas imágenes consecutivas.

**¿Para qué?** Para permitir que el pipeline consuma imágenes base de Docker Hub de forma confiable durante los procesos de build de los contenedores del sistema.

---

### docker/build-push-action

**¿Qué?** Es la acción oficial de Docker para construir y publicar imágenes directamente desde GitHub Actions.

**¿Por qué?** Porque el sistema está compuesto por múltiples servicios desplegados como contenedores, y automatizar la construcción y publicación evita procesos manuales, errores humanos y divergencias entre versiones desplegadas. Además, permite configurar contexto, Dockerfile, etiquetas y caché por servicio.

**¿Para qué?** Para construir y publicar las imágenes de `usuario`, `suscripcion`, `catalogo`, `streaming`, `cobros`, `divisas`, `notificaciones`, `api-gateway` y `frontend` en Artifact Registry, usando etiquetas distintas según el entorno (`develop-<sha>` en desarrollo y versión semántica en release).

---

### appleboy/ssh-action

**¿Qué?** Es una acción de la comunidad que permite ejecutar comandos remotos vía SSH desde GitHub Actions.

**¿Por qué?** Porque parte del despliegue del proyecto se realiza sobre máquinas virtuales en Google Compute Engine, y el pipeline necesita conectarse a esas instancias para actualizar variables, descargar nuevas imágenes, reiniciar servicios y ejecutar respaldos desde una VM específica.

**¿Para qué?** Para automatizar el acceso remoto a **VM1**, **VM2**, **VM3** y **VM4**, permitiendo realizar respaldos de bases de datos y despliegues coordinados sin intervención manual del equipo.

---

## Arquitectura general del pipeline

El pipeline sigue una lógica de promoción por ramas:

```text
feature/* → develop → release
```

Cada nivel representa un mayor grado de validación y estabilidad:

- **feature/**: trabajo local o colaborativo previo.
- **develop**: integración continua y despliegue continuo al entorno de desarrollo.
- **release**: preparación y despliegue controlado a producción.

El diseño busca que ningún cambio llegue a entornos superiores sin pasar primero por validación técnica y procesos automatizados de construcción y entrega.

---

## Workflow 1 — Integración Continua (`.github/workflows/ci.yml`)

### Objetivo

Validar automáticamente que todos los servicios del sistema pasen sus pruebas y cumplan un **umbral mínimo de cobertura del 75 %** antes de habilitar etapas posteriores del ciclo de entrega.

### Eventos que lo activan

- `push` a `develop`
- `push` a `release`
- `pull_request` hacia `develop`
- `pull_request` hacia `release`

### Decisiones de diseño

#### Uso de `concurrency`

El workflow define:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Esto significa que si se hacen varios pushes seguidos a la misma rama, GitHub cancela ejecuciones anteriores que aún estén corriendo y conserva solo la más reciente.

**¿Por qué se diseñó así?** Porque evita gastar runners procesando commits obsoletos y acelera la retroalimentación sobre el estado real más actual de la rama.

### Jobs del workflow CI

| Job | Tecnología | Propósito |
| --- | --- | --- |
| `test-usuario` | Python | Ejecuta tests y cobertura del servicio usuario |
| `test-suscripcion` | Python | Ejecuta tests y cobertura del servicio suscripcion |
| `test-catalogo` | Go | Ejecuta tests unitarios y cobertura del servicio catalogo |
| `test-streaming` | Go | Ejecuta tests unitarios y cobertura del servicio streaming |
| `test-cobros` | TypeScript | Ejecuta tests del servicio cobros |
| `test-divisas` | TypeScript | Ejecuta tests del servicio divisas |
| `test-notificaciones` | TypeScript | Ejecuta tests del servicio notificaciones |
| `test-api-gateway` | TypeScript | Ejecuta tests del API Gateway |
| `quality-gate` | Control | Verifica que todos los jobs anteriores hayan pasado |

### Explicación paso a paso del CI

#### 1. Clonación del repositorio

Cada job inicia con `actions/checkout@v4` para garantizar que el runner trabaje sobre el estado exacto del commit que disparó el pipeline.

#### 2. Preparación del entorno según el lenguaje

Dependiendo del servicio, el workflow configura el runtime correspondiente:

- **Python 3.12** para `usuario` y `suscripcion`
- **Go 1.23** para `catalogo` y `streaming`
- **Node.js 20 + pnpm** para `cobros`, `divisas`, `notificaciones` y `api-gateway`

Esta decisión es importante porque el sistema es **políglota**, por lo que un único entorno base no sería suficiente ni correcto para todos los componentes.

#### 3. Instalación de dependencias

Cada servicio instala sus propias dependencias desde su directorio de trabajo:

- Python usa `pip install -r requirements.txt pytest pytest-cov`
- Go usa directamente el tooling del lenguaje con dependencias definidas en `go.sum`
- TypeScript usa `pnpm install --frozen-lockfile`

El uso de `--frozen-lockfile` en `pnpm` asegura reproducibilidad exacta de dependencias.

#### 4. Ejecución de pruebas y cobertura

El diseño del CI no solo verifica que los tests pasen, sino que impone un criterio de calidad cuantificable.

- En **Python**, se usa `pytest` con `pytest-cov` y `--cov-fail-under=75`
- En **Go**, se genera `coverage.out`, se calcula la cobertura total y se falla el job manualmente si es menor a 75 %
- En **TypeScript**, la validación de cobertura está delegada a la configuración interna de cada servicio, según lo indicado en sus scripts o umbrales del proyecto

#### 5. Publicación de evidencia

Algunos jobs publican archivos de cobertura como artefactos usando `actions/upload-artifact`, lo cual conserva evidencia útil para revisión posterior.

#### 6. Puerta de calidad final

El job `quality-gate` depende de todos los anteriores. Su función no es volver a probar, sino actuar como un **punto único de aprobación técnica**.

Si cualquier job falla:

- `quality-gate` no se considera exitoso
- el estado global del CI queda en fallo
- el cambio no queda técnicamente validado

### Justificación del `quality-gate`

**¿Qué?** Es un job final que depende de todos los jobs de validación del workflow CI.

**¿Por qué?** Porque centraliza el resultado del pipeline en un único punto de control fácil de interpretar. En vez de obligar a revisar manualmente varios jobs dispersos, se entrega una señal global de aprobación o rechazo.

**¿Para qué?** Para representar formalmente la condición de “pipeline aprobado”, simplificando auditoría, seguimiento y bloqueo de cambios que no cumplan los requisitos mínimos de calidad.

---

## Workflow 2 — Entrega Continua a desarrollo (`.github/workflows/cd-develop.yml`)

### Objetivo

Automatizar el despliegue del entorno de desarrollo cuando se actualiza la rama `develop`, publicando nuevas imágenes, generando respaldos previos y actualizando las máquinas virtuales correspondientes.

### Evento que lo activa

- `push` a `develop`

### Jobs del workflow CD develop

| Job | Depende de | Descripción |
| --- | --- | --- |
| `ci-passed` | — | Paso informativo que confirma el evento sobre `develop` |
| `build-and-push` | `ci-passed` | Construye y publica 9 imágenes en Artifact Registry |
| `backup-databases` | `ci-passed` | Respalda 7 bases de datos en Google Cloud Storage |
| `deploy-vm1` | `build-and-push`, `backup-databases` | Actualiza servicios en VM1 |
| `deploy-vm2` | `build-and-push`, `backup-databases` | Actualiza servicios en VM2 |
| `deploy-vm4` | `build-and-push`, `backup-databases` | Actualiza frontend y API Gateway en VM4 |

### Explicación paso a paso del CD develop

#### 1. Identificación del despliegue

El workflow calcula una etiqueta corta basada en el SHA del commit:

```text
develop-<sha_corto>
```

Esto permite rastrear exactamente qué versión del código fue desplegada en desarrollo.

#### 2. Autenticación con Google Cloud

Mediante `google-github-actions/auth`, el runner se autentica usando una cuenta de servicio con permisos sobre Artifact Registry y otros recursos necesarios.

#### 3. Configuración de Docker y Buildx

Se prepara el entorno para construir imágenes de forma moderna, con soporte de caché y publicación remota.

#### 4. Login a Docker Hub

Se autentica contra Docker Hub para evitar limitaciones al descargar imágenes base durante la construcción de contenedores.

#### 5. Build & Push de 9 imágenes

El pipeline construye y publica las imágenes de:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`
- `cobros`
- `divisas`
- `notificaciones`
- `api-gateway`
- `frontend`

Cada imagen se sube a **Artifact Registry** con la etiqueta `develop-<sha>`.

Esto garantiza que el entorno de desarrollo consuma artefactos inmutables, trazables y consistentes.

#### 6. Backup paralelo de bases de datos

Mientras se construyen las imágenes, otro job se conecta por SSH a **VM3** y ejecuta respaldos de siete bases de datos PostgreSQL.

Los respaldos:

- se generan con `pg_dump`
- se comprimen con `gzip`
- se suben a **Google Cloud Storage**

Esta decisión mejora la seguridad operativa: si un despliegue posterior produce un problema, existe evidencia y respaldo reciente del estado de los datos.

#### 7. Despliegue distribuido en VMs

Una vez que el build y el backup finalizan con éxito, se despliegan los cambios en paralelo sobre tres máquinas:

- **VM1**: `usuario`, `suscripcion`, `catalogo`
- **VM2**: `streaming`, `cobros`, `divisas`, `notificaciones`
- **VM4**: `api-gateway`, `frontend`

Cada job de despliegue realiza lo siguiente:

1. prepara una clave SSH temporal
2. se conecta a la VM correspondiente
3. autentica Docker contra Artifact Registry
4. actualiza variables `AR_REGISTRY` e `IMAGE_TAG` en el `.env`
5. hace `docker compose pull`
6. ejecuta `docker compose up -d`

### Justificación del diseño de despliegue en VMs separadas

**¿Qué?** Es una estrategia de despliegue distribuido donde los componentes del sistema se reparten entre varias máquinas virtuales especializadas.

**¿Por qué?** Porque evita concentrar toda la carga operativa en una sola instancia, facilita la separación por responsabilidades, mejora la organización de recursos y reduce el impacto de fallos localizados.

**¿Para qué?** Para mantener un entorno de desarrollo más escalable y administrable, donde cada grupo de servicios pueda actualizarse de forma coordinada según su rol dentro de la arquitectura del sistema.

---

## Workflow 3 — Entrega controlada a producción (`.github/workflows/cd-release.yml`)

### Objetivo

Desplegar una nueva versión del sistema en producción de forma controlada, trazable y recuperable, usando versionado semántico, contenedores versionados y despliegue sobre Kubernetes.

### Evento que lo activa

- `push` a `release`

### Jobs del workflow CD release

| Job | Depende de | Descripción |
| --- | --- | --- |
| `ci-passed` | — | Paso informativo de inicio sobre `release` |
| `version` | `ci-passed` | Calcula y publica el siguiente tag `v2.X.0` |
| `build-and-push` | `version` | Construye y publica 9 imágenes con versión semántica |
| `backup-databases` | `ci-passed` | Respalda 7 bases de datos antes del release |
| `deploy-gke` | `build-and-push`, `backup-databases` | Despliega en GKE, verifica rollout y revierte si falla |

### Explicación paso a paso del CD release

#### 1. Versionamiento semántico automático

Antes de desplegar, el workflow consulta los tags existentes con patrón `v2.*.0` y calcula la siguiente versión disponible.

Ejemplo:

- si el último tag es `v2.4.0`
- el siguiente será `v2.5.0`

Luego publica ese nuevo tag en el repositorio.

### Justificación del versionamiento semántico automatizado

**¿Qué?** Es un mecanismo que genera automáticamente una nueva versión de release antes de construir y desplegar el sistema.

**¿Por qué?** Porque evita versionados manuales inconsistentes, mejora la trazabilidad entre código e imágenes desplegadas y facilita identificar exactamente qué release está en ejecución.

**¿Para qué?** Para etiquetar de forma formal cada despliegue de producción y mantener una historia clara de versiones liberadas.

#### 2. Build & Push de imágenes versionadas

Con la versión calculada, el workflow construye las mismas 9 imágenes del sistema, pero ahora las publica con dos etiquetas:

- la versión semántica, por ejemplo `v2.5.0`
- la etiqueta `latest`

Esto permite tanto trazabilidad exacta como referencia práctica a la versión más reciente.

#### 3. Backup pre-release

En paralelo al build, se ejecuta un respaldo completo de las siete bases de datos hacia Google Cloud Storage, pero almacenado bajo una ruta específica de **pre-release**.

Esto actúa como medida preventiva antes de modificar el entorno productivo.

#### 4. Autenticación y conexión a GKE

El job `deploy-gke`:

- autentica el runner contra GCP
- obtiene credenciales del clúster
- verifica conectividad con `kubectl cluster-info`

#### 5. Sustitución de variables en manifiestos

Los archivos del directorio `k8s/` usan variables como `AR_REGISTRY`, `VERSION` y `VM3_HOST`, las cuales se reemplazan durante el pipeline mediante `envsubst`.

Esta decisión desacopla la definición del despliegue del valor específico de cada release.

#### 6. Creación o actualización del namespace y secretos

Antes de aplicar los manifiestos, el workflow:

- crea el namespace si no existe
- genera o actualiza un `Secret` de Kubernetes con credenciales y variables sensibles

Esto asegura que los pods reciban configuración sensible sin hardcodearla dentro de los manifiestos del repositorio.

#### 7. Aplicación del despliegue

Se ejecuta:

```bash
kubectl apply -f k8s/ --namespace=quetzaltv-prod
```

Con esto se publican o actualizan los recursos necesarios del sistema dentro del clúster.

#### 8. Verificación del rollout

Después de aplicar los manifiestos, el workflow inspecciona todos los `Deployment` del namespace y espera a que completen su rollout con éxito.

Esto evita marcar como exitoso un despliegue que solo fue aceptado por el clúster, pero no llegó realmente a estado saludable.

#### 9. Rollback automático si algo falla

Si alguno de los despliegues no logra completarse correctamente, el workflow ejecuta `kubectl rollout undo` sobre cada deployment afectado y espera nuevamente a que la versión previa quede saludable.

### Justificación del rollback automático

**¿Qué?** Es un mecanismo de recuperación automática que revierte el despliegue cuando el nuevo rollout falla.

**¿Por qué?** Porque en producción no basta con detectar el error; también es necesario restaurar el servicio lo más rápido posible para minimizar indisponibilidad e impacto al usuario.

**¿Para qué?** Para aumentar la resiliencia del pipeline de producción, reduciendo el riesgo operativo asociado a despliegues defectuosos.

---

## Diferencia entre CI, CD develop y CD release

| Workflow | Finalidad principal | Entorno objetivo | Nivel de riesgo |
| --- | --- | --- | --- |
| `ci.yml` | Validar calidad técnica | Ninguno | Bajo |
| `cd-develop.yml` | Entregar cambios integrados | Desarrollo en GCE | Medio |
| `cd-release.yml` | Liberar versión estable | Producción en GKE | Alto |

Esta separación responde a un principio de ingeniería importante: **no todos los cambios deben tratarse igual**. Validar, integrar y liberar a producción son actividades distintas y, por lo tanto, requieren controles distintos.

---

## Secretos requeridos en GitHub

Los workflows dependen de secretos configurados en **Settings > Secrets and variables > Actions**.

### Secretos para Google Cloud e imágenes

| Secreto | Descripción |
| --- | --- |
| `GCP_PROJECT_ID` | ID del proyecto de Google Cloud |
| `GCP_SA_KEY` | JSON de la cuenta de servicio con permisos requeridos |
| `AR_REGION` | Región de Artifact Registry |
| `DOCKERHUB_USERNAME` | Usuario de Docker Hub |
| `DOCKERHUB_TOKEN` | Token de Docker Hub |

### Secretos para despliegue en VMs

| Secreto | Descripción |
| --- | --- |
| `VM1_HOST` | IP o dominio de VM1 |
| `VM2_HOST` | IP o dominio de VM2 |
| `VM3_HOST` | IP o dominio de VM3 |
| `VM4_HOST` | IP o dominio de VM4 |
| `VM_USER` | Usuario SSH de las VMs |
| `VM_SSH_KEY` | Llave privada SSH |

### Secretos para respaldo y datos

| Secreto | Descripción |
| --- | --- |
| `GCS_BACKUP_BUCKET` | Bucket de Google Cloud Storage para respaldos |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `GCS_SA_KEY` | JSON para firma de URLs V4 en servicios que lo requieren |

### Secretos para despliegue en GKE

| Secreto | Descripción |
| --- | --- |
| `GKE_CLUSTER` | Nombre del clúster de GKE |
| `GKE_ZONE` | Zona o ubicación del clúster |
| `JWT_SECRET` | Clave JWT |
| `EMAIL_USER` | Usuario del servicio de correo |
| `EMAIL_PASS` | Contraseña del servicio de correo |
| `EMAIL_FROM` | Remitente del servicio de correo |
