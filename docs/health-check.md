# Health Check — Terraform · Ansible · Kubernetes · CronJob

Referencia rápida para verificar el estado de la infraestructura de **Quetzal TV** desplegada en GCP.

> **Namespace de producción:** `quetzaltv-prod`

---

## 1. Terraform

> Directorio: `terraform/`

### Verificar que Terraform está instalado y su versión

```bash
terraform version
```

### Inicializar (descarga providers y conecta al backend remoto)

```bash
terraform init
```

### Validar que los archivos `.tf` no tienen errores de sintaxis

```bash
terraform validate
```

Debe responder: `Success! The configuration is valid.`

### Ver el estado actual de los recursos desplegados

```bash
terraform show
```

### Listar todos los recursos que Terraform gestiona

```bash
terraform state list
```

### Detectar si hubo cambios externos (drift) respecto al estado guardado

```bash
terraform plan
```

Si la salida dice `No changes. Your infrastructure matches the configuration.`, nada fue modificado fuera de Terraform.

### Obtener los outputs (IPs, nombre del clúster, etc.)

```bash
terraform output
```

Outputs individuales:

```bash
terraform output -raw vm1_external_ip
terraform output -raw vm3_external_ip
terraform output -raw gke_cluster_name
terraform output -raw artifact_registry_url
```

### Verificar que el bucket de estado existe

```bash
gcloud storage ls gs://quetzaltv-tf-state
```

---

## 2. Ansible

> Directorio: `ansible/`

### Verificar que Ansible está instalado y su versión

```bash
ansible --version
```

### Ver los hosts del inventario

```bash
cd ansible/
ansible-inventory --list -y
```

O en formato más legible:

```bash
ansible-inventory --graph
```

### Verificar conectividad SSH a todas las VMs (ping)

```bash
cd ansible/
ansible all -m ping
```

Respuesta esperada en cada host:

```
vm1 | SUCCESS => { "ping": "pong" }
vm2 | SUCCESS => { "ping": "pong" }
vm3 | SUCCESS => { "ping": "pong" }
vm4 | SUCCESS => { "ping": "pong" }
```

### Dry-run: ver qué ejecutaría el playbook sin aplicar cambios

```bash
cd ansible/
ansible-playbook playbooks/site.yml --check \
  -e "db_password=PLACEHOLDER" \
  -e "jwt_secret=PLACEHOLDER" \
  -e "email_user=PLACEHOLDER" \
  -e "email_pass=PLACEHOLDER" \
  -e "email_from=QuetzalTV"
```

### Ver facts (info del sistema) de todos los hosts

```bash
cd ansible/
ansible all -m gather_facts --tree /tmp/facts/
```

### Verificar que Docker corre en las VMs de aplicación (VM1, VM2, VM4)

```bash
ansible app_vms -m command -a "docker ps"
```

### Verificar que los 7 contenedores PostgreSQL corren en VM3

```bash
ansible db -m command -a "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

### Conectarse manualmente a una VM para inspeccionar

```bash
ssh -i ~/.ssh/quetzaltv_deploy ubuntu@<VM_EXTERNAL_IP>

# Ya dentro de la VM:
docker ps
docker logs <nombre_contenedor>
```

---

## 3. Kubernetes (GKE)

### Conectar kubectl al clúster de GKE

```bash
gcloud container clusters get-credentials quetzaltv-cluster \
  --zone us-central1-a \
  --project sa-proyecto-g10-500320
```

### Verificar que kubectl apunta al clúster correcto

```bash
kubectl config current-context
kubectl cluster-info
```

### Listar nodos del clúster y su estado

```bash
kubectl get nodes
kubectl get nodes -o wide        # incluye IP, OS, versión de kubelet
```

Estado esperado: `Ready` en todos los nodos.

### Ver todos los pods en todos los namespaces

```bash
kubectl get pods --all-namespaces
kubectl get pods --all-namespaces -o wide   # incluye nodo y IP
```

### Ver pods en el namespace de la aplicación

```bash
kubectl get pods -n quetzaltv-prod
kubectl get pods -n quetzaltv-prod --watch       # monitoreo en vivo
```

### Verificar que no hubo cambios inesperados en deployments

```bash
kubectl get deployments -n quetzaltv-prod
kubectl rollout status deployment/<nombre> -n quetzaltv-prod
```

### Ver servicios y sus IPs/puertos expuestos

```bash
kubectl get services -n quetzaltv-prod
kubectl get services --all-namespaces
```

### Ver ingress (puntos de entrada HTTP/HTTPS)

```bash
kubectl get ingress --all-namespaces
```

### Describir un recurso en detalle (útil para diagnosticar)

```bash
kubectl describe pod <nombre-pod> -n quetzaltv-prod
kubectl describe deployment <nombre-deployment> -n quetzaltv-prod
kubectl describe node <nombre-nodo>
```

### Ver logs de un pod

```bash
kubectl logs <nombre-pod> -n quetzaltv-prod
kubectl logs <nombre-pod> -n quetzaltv-prod --previous   # último crash
kubectl logs <nombre-pod> -n quetzaltv-prod -f           # en vivo (follow)
```

### Uso de recursos (CPU y memoria)

```bash
kubectl top nodes
kubectl top pods -n quetzaltv-prod
```

### Verificar ConfigMaps y Secrets (sin revelar valores)

```bash
kubectl get configmaps -n quetzaltv-prod
kubectl get secrets -n quetzaltv-prod
```

### Verificar que las imágenes en uso vienen del Artifact Registry correcto

```bash
kubectl get pods -n quetzaltv-prod -o jsonpath="{.items[*].spec.containers[*].image}" | tr ' ' '\n'
```

Las imágenes deben empezar con `us-central1-docker.pkg.dev/sa-proyecto-g10-500320/quetzaltv/`.

### Verificar HPA (autoscaling horizontal) si está configurado

```bash
kubectl get hpa -n quetzaltv-prod
```

---

## 4. CronJob — Depuración de cuentas inactivas (Producción · K8s)

> Archivo: `k8s/13-depuracion-usuarios.yaml` · Namespace: `quetzaltv-prod`

### ¿Qué es un CronJob en Kubernetes?

Un **CronJob** es un objeto de Kubernetes que crea `Jobs` de forma automática según una expresión de tiempo (cron). Cada `Job` crea uno o más `Pods` que ejecutan una tarea y terminan. Es el equivalente al `crontab` de Linux, pero gestionado por el clúster.

```
CronJob (schedule: "* * * * *")
    │
    │  cada minuto crea un →
    ▼
  Job (depuracion-usuarios-<timestamp>)
    │
    │  que crea un →
    ▼
  Pod (efímero, termina al finalizar la tarea)
```

### Sintaxis del schedule

```
* * * * *
│ │ │ │ └── día de la semana (0-7, 0 y 7 = domingo)
│ │ │ └──── mes (1-12)
│ │ └────── día del mes (1-31)
│ └──────── hora (0-23)
└────────── minuto (0-59)
```

| Expresión | Significado |
|---|---|
| `* * * * *` | cada minuto |
| `0 * * * *` | cada hora (al minuto 0) |
| `0 2 * * *` | cada día a las 2:00 AM |
| `0 2 * * 0` | cada domingo a las 2:00 AM |

El CronJob de depuración usa `* * * * *` para que en la demo/defensa se pueda observar su ejecución en tiempo real sin esperar.

### ¿Qué hace este CronJob?

Cada minuto conecta directo a la BD `quetzal_usuario` en VM3 (puerto 5437) y hace soft-delete de toda cuenta con más de 5 minutos de inactividad. Usa `pg_advisory_xact_lock` para evitar ejecuciones solapadas y `concurrencyPolicy: Forbid` para que K8s no lance un segundo pod si el anterior aún no terminó.

### Prerequisito — Apuntar el ConfigMap a la IP **interna** de VM3

> **Importante:** el ConfigMap puede tener la IP externa de VM3 si fue creado con Terraform directamente. Siempre verificar y corregir a la IP interna antes de aplicar el CronJob, ya que los pods de GKE alcanzan VM3 por la red interna de GCP.

Verificar el valor actual:

```powershell
kubectl get configmap quetzaltv-config -n quetzaltv-prod -o jsonpath="{.data.DB_HOST}"
```

Si no muestra `10.0.0.4`, parchearlo:

```powershell
# PowerShell
kubectl patch configmap quetzaltv-config `
  -n quetzaltv-prod `
  --type merge `
  -p '{\"data\":{\"DB_HOST\":\"10.0.0.4\"}}'
```

```bash
# Bash/Linux
kubectl patch configmap quetzaltv-config \
  -n quetzaltv-prod \
  --type merge \
  -p '{"data":{"DB_HOST":"10.0.0.4"}}'
```

### Instalar / aplicar el CronJob

```bash
kubectl apply -f k8s/13-depuracion-usuarios.yaml
```

### Verificar que el CronJob existe y su estado

```powershell
kubectl get cronjob -n quetzaltv-prod
```

Salida esperada:

```
NAME                  SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
depuracion-usuarios   * * * * *   False     0        <none>          7s
```

Columnas clave:
- `SCHEDULE: * * * * *` — corre cada minuto ✅
- `SUSPEND: False` — activo, no pausado ✅
- `LAST SCHEDULE: <none>` — normal en los primeros segundos; aparecerá tras el primer disparo automático ✅

### Ver el historial de Jobs generados automáticamente

```powershell
kubectl get jobs -n quetzaltv-prod --sort-by=.metadata.creationTimestamp
```

Los jobs exitosos se conservan hasta 3 (según `successfulJobsHistoryLimit`). El nombre sigue el patrón `depuracion-usuarios-<timestamp>`.

### Ver logs del último Job automático

```powershell
# Listar jobs para obtener el nombre
kubectl get jobs -n quetzaltv-prod --sort-by=.metadata.creationTimestamp

# Ver logs
kubectl logs job/<nombre-del-job> -n quetzaltv-prod
```

### Disparar el CronJob manualmente (para pruebas)

```powershell
kubectl create job depuracion-prueba `
  --from=cronjob/depuracion-usuarios `
  -n quetzaltv-prod
```

```bash
# Bash
kubectl create job depuracion-prueba \
  --from=cronjob/depuracion-usuarios \
  -n quetzaltv-prod
```

Ver los logs (esperar ~10 segundos para que el pod arranque):

```powershell
kubectl logs job/depuracion-prueba -n quetzaltv-prod
```

Salida real verificada en producción:

```
Iniciando depuracion de cuentas inactivas...
BEGIN
 pg_advisory_xact_lock
-----------------------

(1 row)

SELECT 0
UPDATE 0
UPDATE 0
UPDATE 0
COMMIT
Depuracion finalizada.
```

`SELECT 0` indica que no había cuentas inactivas pendientes — comportamiento correcto.  
`SELECT N` con N > 0 indica cuentas depuradas en esa ejecución.

Limpiar el job de prueba:

```powershell
kubectl delete job depuracion-prueba -n quetzaltv-prod
```

### Verificar que el Secret con la contraseña de BD existe

```powershell
kubectl get secret quetzaltv-secrets -n quetzaltv-prod
kubectl describe secret quetzaltv-secrets -n quetzaltv-prod
```

### Diagnosticar un Job fallido

```powershell
# Eventos del job
kubectl describe job <nombre-job-fallido> -n quetzaltv-prod

# Pod generado por el job
kubectl get pods -n quetzaltv-prod --selector=job-name=<nombre-job-fallido>
kubectl logs <nombre-pod> -n quetzaltv-prod
```

Causas comunes de fallo:
- `DB_HOST` en el ConfigMap apunta a la IP **externa** de VM3 en lugar de la interna (`10.0.0.4`)
- El Secret `quetzaltv-secrets` no contiene `DB_PASSWORD`
- VM3 no está corriendo o el contenedor PostgreSQL del puerto 5437 está caído
- Firewall GCP bloqueando tráfico desde los nodos GKE hacia VM3 en el puerto 5437

### Comandos para demostrar que el CronJob está en uso

Estos comandos muestran evidencia concreta de que el CronJob se ejecutó y está activo.

**1. Ver el CronJob registrado en el clúster:**
```powershell
kubectl get cronjob -n quetzaltv-prod
```
```
NAME                  SCHEDULE    SUSPEND   ACTIVE   LAST SCHEDULE   AGE
depuracion-usuarios   * * * * *   False     0        45s             10m
```

**2. Ver los Jobs creados automáticamente por el CronJob:**
```powershell
kubectl get jobs -n quetzaltv-prod --sort-by=.metadata.creationTimestamp
```
```
NAME                             COMPLETIONS   DURATION   AGE
depuracion-usuarios-29136960     1/1           4s         8m
depuracion-usuarios-29136961     1/1           3s         7m
depuracion-usuarios-29136962     1/1           4s         6m
```
Cada fila es una ejecución automática. `1/1` significa que el Job completó exitosamente.

**3. Ver los Pods que ejecutó el CronJob (incluye los terminados):**
```powershell
kubectl get pods -n quetzaltv-prod --selector=job-name=depuracion-usuarios-29136962
```
```
NAME                                   READY   STATUS      RESTARTS   AGE
depuracion-usuarios-29136962-xxxxx     0/1     Completed   0          6m
```
`STATUS: Completed` confirma que el Pod terminó exitosamente y no está crasheando.

**4. Ver los logs de una ejecución automática específica:**
```powershell
kubectl logs -n quetzaltv-prod --selector=job-name=depuracion-usuarios-29136962
```

**5. Ver el detalle completo del CronJob (historial, configuración, eventos):**
```powershell
kubectl describe cronjob depuracion-usuarios -n quetzaltv-prod
```
Muestra: schedule, último disparo, Jobs activos, Jobs exitosos/fallidos, y el historial de eventos del clúster.

**6. Confirmar que el YAML está aplicado correctamente:**
```powershell
kubectl get cronjob depuracion-usuarios -n quetzaltv-prod -o yaml
```
Devuelve la especificación completa tal como está almacenada en etcd.

**7. Ver eventos del CronJob en tiempo real (útil en defensa):**
```powershell
kubectl get events -n quetzaltv-prod --field-selector reason=SuccessfulCreate --sort-by=.lastTimestamp
```
Muestra cada vez que el CronJob creó un Job nuevo, con timestamp.

---

## 4b. CronJob — Depuración en entorno Develop (Docker Compose · VM1)

> Archivo: `backend/deploy/compose/docker-compose.cloud-vm1.yml` · Servicio: `depuracion-usuarios`

**Diferencia respecto a K8s:** en develop no hay CronJob de Kubernetes. El servicio `depuracion-usuarios` es un **contenedor long-running** (`restart: unless-stopped`) que al arrancar escribe `/tmp/run.sh` con las variables de conexión ya interpoladas y luego ejecuta `crond -f` internamente. El cron del contenedor llama a ese script cada minuto.

> **Nota de implementación:** las variables `PGHOST`, `PGPORT`, etc. se escriben en `/tmp/run.sh` al inicio del contenedor usando `$$VAR` en el YAML de Docker Compose (doble `$$` = escape para que Docker Compose no las sustituya del host y las deje pasar al shell del contenedor). Esto es necesario porque `crond` en Alpine no hereda el entorno del proceso padre.

### Conectarse a VM1 y posicionarse en el directorio

```bash
ssh -i ~/.ssh/quetzaltv_deploy ubuntu@130.211.203.9
cd /opt/quetzaltv
```

### Verificar que `DB_VM3_HOST` apunta a la IP interna de VM3

```bash
grep DB_VM3_HOST backend/deploy/compose/.env
# Debe mostrar: DB_VM3_HOST=10.0.0.4
```

### Descargar imagen y levantar el servicio

```bash
docker compose \
  -f backend/deploy/compose/docker-compose.cloud-vm1.yml \
  --env-file backend/deploy/compose/.env \
  pull depuracion-usuarios

docker compose \
  -f backend/deploy/compose/docker-compose.cloud-vm1.yml \
  --env-file backend/deploy/compose/.env \
  up -d depuracion-usuarios
```

No deben aparecer warnings de `PGHOST`/`PGPORT`/`PGPASSWORD`. Si aparecen, el YAML tiene un error en el escape `$$`.

### Verificar que el contenedor está corriendo

```bash
docker ps --filter name=quetzal-depuracion-usuarios
```

Estado esperado: `Up X minutes`.

### Ver logs en vivo

```bash
docker logs -f quetzal-depuracion-usuarios
```

Salida real verificada en develop (primera ejecución con cuentas inactivas):

```
Depurador configurado: ejecucion cada minuto.
BEGIN
 pg_advisory_xact_lock
-----------------------

(1 row)

SELECT 4
UPDATE 10
UPDATE 4
UPDATE 4
COMMIT
```

Interpretación: encontró 4 cuentas inactivas → cerró 10 sesiones → desactivó 4 perfiles → soft-delete en 4 cuentas.

### Verificar el script generado por el contenedor

```bash
docker exec quetzal-depuracion-usuarios cat /tmp/run.sh
```

Debe mostrar las variables con sus valores reales ya interpolados:

```sh
#!/bin/sh
export PGHOST=10.0.0.4
export PGPORT=5437
export PGDATABASE=quetzal_usuario
export PGUSER=postgres
export PGPASSWORD=...
export PGCONNECT_TIMEOUT=10
psql -v ON_ERROR_STOP=1 -f /tmp/depuracion.sql
```

### Verificar que crond está activo

```bash
docker exec quetzal-depuracion-usuarios ps aux
```

Debe aparecer `crond` en la lista de procesos.

### Verificar el crontab

```bash
docker exec quetzal-depuracion-usuarios cat /etc/crontabs/root
```

Debe mostrar:

```
* * * * * /tmp/run.sh >> /proc/1/fd/1 2>> /proc/1/fd/2
```

### Detener el servicio (solo si es necesario)

```bash
docker compose \
  -f backend/deploy/compose/docker-compose.cloud-vm1.yml \
  --env-file backend/deploy/compose/.env \
  stop depuracion-usuarios
```

### Comandos para demostrar que el crond está en uso (develop)

**1. Confirmar que el contenedor está corriendo:**
```bash
docker ps --filter name=quetzal-depuracion-usuarios --format "table {{.Names}}\t{{.Status}}\t{{.RunningFor}}"
```
```
NAMES                          STATUS         RUNNING FOR
quetzal-depuracion-usuarios    Up 12 minutes  12 minutes
```

**2. Confirmar que crond está activo dentro del contenedor:**
```bash
docker exec quetzal-depuracion-usuarios ps aux
```
```
PID   USER     COMMAND
    1 root     crond -f -l 2
   ...
```
PID 1 es `crond`, lo que confirma que es el proceso principal del contenedor.

**3. Ver el script de ejecución generado al arrancar:**
```bash
docker exec quetzal-depuracion-usuarios cat /tmp/run.sh
```
```sh
#!/bin/sh
export PGHOST=10.0.0.4
export PGPORT=5437
export PGDATABASE=quetzal_usuario
export PGUSER=postgres
export PGPASSWORD=...
export PGCONNECT_TIMEOUT=10
psql -v ON_ERROR_STOP=1 -f /tmp/depuracion.sql
```

**4. Ver el crontab activo:**
```bash
docker exec quetzal-depuracion-usuarios cat /etc/crontabs/root
```
```
* * * * * /tmp/run.sh >> /proc/1/fd/1 2>> /proc/1/fd/2
```

**5. Ver las últimas ejecuciones en los logs:**
```bash
docker logs --tail 50 quetzal-depuracion-usuarios
```
Cada bloque `BEGIN ... COMMIT` corresponde a una ejecución del cron. Si hay múltiples bloques, confirma que el cron ha corrido varias veces.

**6. Contar cuántas veces ha corrido:**
```bash
docker logs quetzal-depuracion-usuarios 2>&1 | grep -c "COMMIT"
```
Devuelve el número de ejecuciones completadas desde que el contenedor arrancó.

### Causas comunes de fallo en develop

- `DB_VM3_HOST` en `.env` apunta a la IP externa de VM3 en lugar de la interna (`10.0.0.4`)
- El contenedor PostgreSQL de usuarios (puerto 5437) en VM3 no está corriendo
- Warnings de `PGHOST not set` al hacer `up`: el YAML tiene `$PGHOST` en lugar de `$$PGHOST`

---

## 5. Pruebas de carga — Locust

> Directorio: `locust/` · Archivo principal: `locust/locustfile.py`

### ¿Qué es Locust?

**Locust** es una herramienta de pruebas de carga escrita en Python. Permite simular miles de usuarios concurrentes enviando peticiones HTTP a la plataforma y medir tiempos de respuesta, tasa de errores y throughput (RPS).

El script de Quetzal TV simula dos perfiles de usuario:

| Clase | Peso | Comportamiento |
|---|---|---|
| `UsuarioAnonimo` | 70 % | Navega catálogo, planes y divisas sin autenticarse |
| `UsuarioAutenticado` | 30 % | Inicia sesión y consulta su perfil, catálogo y monedas |

### Prerequisito — Instalar Locust

```powershell
pip install locust
# o usando el requirements del proyecto:
pip install -r locust/requirements.txt
```

Verificar la instalación:

```powershell
locust --version
```

### Credenciales para el usuario autenticado

El `UsuarioAutenticado` necesita una cuenta real en el sistema. Crear una desde el frontend (`http://8.232.249.93`) y luego exportar las variables antes de correr Locust:

```powershell
# PowerShell
$env:LOCUST_EMAIL    = "correo@ejemplo.com"
$env:LOCUST_PASSWORD = "contraseña"
```

```bash
# Bash/Linux
export LOCUST_EMAIL="correo@ejemplo.com"
export LOCUST_PASSWORD="contraseña"
```

Si no se exportan, el script usa los defaults `test@quetzaltv.com` / `Test1234!` y el login fallará con 401 — las tareas autenticadas se saltarán automáticamente sin detener la prueba.

### Opción A — Interfaz web (recomendada para ver tráfico en vivo)

```powershell
locust -f locust/locustfile.py --host http://8.232.249.93
```

Abre `http://localhost:8089` en el navegador. Configura:
- **Number of users:** 50
- **Spawn rate:** 5

Haz clic en **Start swarming**. Verás en tiempo real:

- Tabla de peticiones con RPS, tiempos de respuesta (mediana, p95) y tasa de fallos
- Gráficas de RPS y tiempos de respuesta por endpoint
- Pestaña **Failures** con detalle de errores
- Pestaña **Charts** con evolución temporal

Al terminar, descarga el reporte desde el botón **Download Report** en la UI.

### Opción B — Headless (terminal + reporte HTML)

```powershell
locust -f locust/locustfile.py `
  --headless `
  --users 50 `
  --spawn-rate 5 `
  --run-time 60s `
  --host http://8.232.249.93 `
  --html locust/reporte.html
```

```bash
# Bash/Linux
locust -f locust/locustfile.py \
  --headless \
  --users 50 \
  --spawn-rate 5 \
  --run-time 60s \
  --host http://8.232.249.93 \
  --html locust/reporte.html
```

El reporte queda en `locust/reporte.html`. Ábrelo con cualquier navegador al finalizar.

Al terminar se imprime un resumen en consola:

```
╔══════════════════════════════════════════════════════╗
║         RESUMEN — Prueba de carga Quetzal TV        ║
╚══════════════════════════════════════════════════════╝
  Peticiones totales : 3247
  Fallos             : 0
  RPS promedio       : 54.1
  Tiempo resp. medio : 312 ms
  Tiempo resp. p95   : 780 ms
  Tiempo resp. p99   : 1203 ms
```

### Endpoints que se prueban

| Endpoint | Clase | Peso relativo |
|---|---|---|
| `GET /health` | Anónimo | bajo |
| `GET /api/catalogo/api/v1/catalog` | Ambas | alto |
| `GET /api/catalogo/api/v1/catalog/search?q=<término>` | Anónimo | medio |
| `GET /api/suscripcion/api/v1/plans` | Ambas | medio |
| `GET /api/divisas/api/v1/monedas` | Anónimo | medio |
| `GET /api/divisas/api/v1/tipo-cambio?...` | Anónimo | medio |
| `GET /api/usuario/api/v1/auth/me` (sin JWT) | Anónimo | bajo — debe retornar 401 |
| `POST /api/usuario/api/v1/auth/login` | Autenticado | una vez al iniciar |
| `GET /api/usuario/api/v1/auth/me` (con JWT) | Autenticado | alto |
| `POST /api/divisas/api/v1/convertir` | Autenticado | bajo |

### Interpretar resultados

- **Failures = 0** — ningún endpoint retornó error inesperado ✅
- **El endpoint `GET /api/usuario/me — sin JWT` marca failure si NO retorna 401** — es un test de seguridad invertido
- **p95 < 1 000 ms** — comportamiento aceptable bajo carga
- **RPS > 30** con 50 usuarios concurrentes es el mínimo esperado para la infraestructura actual

### Causas comunes de fallos durante la prueba

- Login 401: la cuenta no existe o fue eliminada por el CronJob de depuración (ver sección 4). Mientras Locust corre, el login genera sesiones activas y el CronJob no elimina la cuenta.
- Timeout en catálogo: el servicio de catálogo puede tardar en el primer request por cold-start de la conexión a BD.
- 500 en algún endpoint: revisar logs del pod correspondiente con `kubectl logs <pod> -n quetzaltv-prod`.

---

## 6. Verificación rápida combinada

Secuencia de comandos para confirmar de un vistazo que todo está en pie:

```bash
# 1. Terraform — sin drift
terraform -chdir=terraform plan 2>&1 | tail -5

# 2. Ansible — todas las VMs responden
cd ansible && ansible all -m ping

# 3. Kubernetes — nodos y pods
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# 4. CronJob — estado y último job
kubectl get cronjob depuracion-usuarios -n quetzaltv-prod
kubectl get jobs -n quetzaltv-prod --sort-by=.metadata.creationTimestamp | tail -3
```

Si el comando del paso 3 no devuelve nada (o solo la cabecera), todos los pods están en estado correcto. El CronJob debe aparecer con `SUSPEND: False` y una fecha reciente en `LAST SCHEDULE`.

---

[Volver a la documentación](Documentación.md)
