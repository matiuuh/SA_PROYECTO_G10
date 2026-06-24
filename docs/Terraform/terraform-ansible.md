# Infraestructura como Código — Terraform y Ansible

## Índice

1. [Terraform — Qué es y cómo funciona](#1-terraform--qué-es-y-cómo-funciona)
2. [Infraestructura declarada](#2-infraestructura-declarada)
3. [Configuración paso a paso con Terraform](#3-configuración-paso-a-paso-con-terraform)
4. [Ansible — Qué es y cómo funciona](#4-ansible--qué-es-y-cómo-funciona)
5. [Configuración paso a paso con Ansible](#5-configuración-paso-a-paso-con-ansible)

---

## 1. Terraform — Qué es y cómo funciona

**Terraform** es una herramienta de infraestructura como código (IaC) desarrollada por HashiCorp. Permite declarar en archivos `.tf` el estado deseado de la infraestructura y Terraform se encarga de crearla, modificarla o destruirla para que coincida con esa declaración.

### Conceptos clave

| Concepto | Descripción |
|---|---|
| **Provider** | Plugin que se comunica con la API de un proveedor (en este caso, `google` para GCP) |
| **Resource** | Recurso de infraestructura a gestionar (VM, red, clúster, etc.) |
| **State (estado)** | Archivo `.tfstate` donde Terraform registra los recursos que ya creó. Es la fuente de verdad entre el código y la nube. Se almacena en GCS para trabajo en equipo. |
| **Plan** | `terraform plan` muestra qué cambiará sin aplicarlo — revisión previa obligatoria |
| **Apply** | `terraform apply` aplica los cambios declarados en el código |
| **Output** | Valores exportados (IPs, nombres) que otros pasos pueden consumir |

### Ciclo de trabajo

```
Escribir .tf  →  terraform init  →  terraform plan  →  terraform apply
                                                           ↓
                                                    Infraestructura en GCP
                                                    Estado guardado en GCS
```

---

## 2. Infraestructura declarada

### Diagrama de recursos

```
GCP Project: sa-proyecto-g10-500320
│
├── VPC: quetzaltv-vpc (us-central1)
│   └── Subnet: quetzaltv-subnet (10.0.0.0/24)
│       ├── Secondary: gke-pods     (10.1.0.0/16)
│       └── Secondary: gke-services (10.2.0.0/20)
│
├── Firewall rules
│   ├── allow-ssh          : TCP 22 desde 0.0.0.0/0 → tag quetzaltv-vm
│   ├── allow-http         : TCP 80/443 desde 0.0.0.0/0 → tag quetzaltv-public
│   ├── allow-internal     : TCP 5001-5007, 8001-8007, 5433-5439, 6379
│   │                        desde 10.0.0.0/24 y 10.1.0.0/16 → tag quetzaltv-vm
│   └── allow-health-checks: TCP any desde rangos de health checks de GCP → tag quetzaltv-gke
│
├── Compute Engine VMs (zona: us-central1-a)
│   ├── quetzaltv-vm1 (e2-medium, 30 GB) — usuario · suscripcion · catalogo
│   ├── quetzaltv-vm2 (e2-medium, 30 GB) — streaming · cobros · divisas · notificaciones · redis
│   ├── quetzaltv-vm3 (e2-standard-2, 50 GB) — PostgreSQL externo (7 BDs)
│   └── quetzaltv-vm4 (e2-medium, 20 GB) — api-gateway · frontend
│
├── GKE Cluster: quetzaltv-cluster (us-central1-a)
│   └── Node Pool: quetzaltv-node-pool (2 × e2-standard-2, 50 GB)
│
├── Artifact Registry: quetzaltv (us-central1, formato DOCKER)
│
├── Cloud Storage
│   ├── quetzaltv-backups-sa-proyecto-g10-500320 — backups de PostgreSQL (retención 30 días)
│   └── quetzal-tv-streaming — videos y contenido multimedia
│
└── Service Accounts
    ├── quetzaltv-deploy@... — CI/CD: AR Writer + GKE Developer + GCS Object Admin
    └── quetzal-tv-storage@... — firma de URLs V4 para GCS
```

### Archivos Terraform

| Archivo | Contenido |
|---|---|
| `main.tf` | Provider GCP, backend remoto en GCS |
| `variables.tf` | Variables parametrizables (project ID, zona, tipos de máquina) |
| `vpc.tf` | VPC, subnet con rangos secundarios para GKE, reglas de firewall |
| `compute_vms.tf` | Las 4 VMs de Compute Engine |
| `gke.tf` | Clúster GKE y node pool |
| `artifact_registry.tf` | Repositorio Docker en Artifact Registry |
| `storage.tf` | Buckets GCS para backups y streaming |
| `iam.tf` | Service accounts y roles IAM |
| `outputs.tf` | Exporta IPs, nombre del clúster, URL del registry, etc. |
| `terraform.tfvars.example` | Plantilla de variables — copiar a `terraform.tfvars` y completar |

---

## 3. Configuración paso a paso con Terraform

### Paso 1 — Prerrequisitos

```bash
# Instalar Terraform >= 1.6
# https://developer.hashicorp.com/terraform/install

# Autenticarse con GCP (Application Default Credentials)
gcloud auth application-default login

# Establecer el proyecto activo
gcloud config set project sa-proyecto-g10-500320
```

### Paso 2 — Crear el bucket de estado (una sola vez)

El bucket de Terraform state debe existir antes de ejecutar `terraform init`:

```bash
gcloud storage buckets create gs://quetzaltv-tf-state \
  --location=us-central1 \
  --project=sa-proyecto-g10-500320
```

### Paso 3 — Generar par de claves SSH

Esta clave será usada por Ansible y el CI/CD para acceder a las VMs:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/quetzaltv_deploy -C "quetzaltv-deploy"
# La clave pública (~/.ssh/quetzaltv_deploy.pub) va en terraform.tfvars
# La clave privada (~/.ssh/quetzaltv_deploy) va en el secret VM_SSH_KEY de GitHub
```

### Paso 4 — Configurar variables

```bash
cd terraform/
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars y pegar la clave pública en ssh_public_key
```

### Paso 5 — Inicializar Terraform

```bash
terraform init
```

Este comando descarga el provider de GCP y configura el backend remoto en GCS.

> **Captura sugerida:** pantalla completa de `terraform init` mostrando "Terraform has been successfully initialized"

### Paso 6 — Revisar el plan

```bash
terraform plan
```

Muestra todos los recursos que se crearán sin aplicar cambios.

> **Captura sugerida:** salida del plan mostrando los recursos a crear (VMs, GKE, VPC, etc.)

### Paso 7 — Aplicar la infraestructura

```bash
terraform apply
```

Escribir `yes` cuando lo solicite. El proceso toma entre 10 y 15 minutos (el clúster GKE es lo más lento).

> **Captura sugerida:** pantalla de `Apply complete!` con el conteo de recursos creados

### Paso 8 — Obtener los outputs

```bash
terraform output
```

Anota estos valores para el siguiente paso (Ansible) y para actualizar los secrets de GitHub:

```
vm1_external_ip     = "X.X.X.X"
vm1_internal_ip     = "10.0.0.X"
vm2_external_ip     = "X.X.X.X"
vm2_internal_ip     = "10.0.0.X"
vm3_external_ip     = "X.X.X.X"   ← GitHub Secret: VM3_HOST
vm3_internal_ip     = "10.0.0.X"  ← GitHub Secret: VM3_INTERNAL_IP
vm4_external_ip     = "X.X.X.X"   ← URL pública del entorno develop
gke_cluster_name    = "quetzaltv-cluster"
gke_cluster_zone    = "us-central1-a"
artifact_registry_url = "us-central1-docker.pkg.dev/sa-proyecto-g10-500320/quetzaltv"
```

> **Captura sugerida:** salida de `terraform output` en la terminal

---

## 4. Ansible — Qué es y cómo funciona

**Ansible** es una herramienta de automatización de configuración **agentless** (sin agente): no requiere instalar nada en los servidores remotos. Se conecta a las VMs por SSH desde la máquina de control (tu laptop) y ejecuta las tareas declaradas en los **Playbooks**.

### Conceptos clave

| Concepto | Descripción |
|---|---|
| **Playbook** | Archivo YAML que describe las tareas a ejecutar en los hosts |
| **Inventory** | Lista de hosts (VMs) con sus IPs y variables de conexión |
| **Task** | Unidad mínima de trabajo (instalar paquete, crear directorio, copiar archivo) |
| **Module** | Función predefinida de Ansible (apt, copy, template, systemd, user, etc.) |
| **Template (Jinja2)** | Archivo con variables que Ansible rellena al copiar al servidor |
| **become** | Equivalente a `sudo` — permite ejecutar tareas con privilegios de root |
| **Agentless** | Ansible solo necesita SSH y Python en el servidor remoto. No instala ningún daemon. |

### Arquitectura de conexión

```
Tu laptop (control node)          VMs en GCP (managed nodes)
         │                                  │
         │  SSH (clave quetzaltv_deploy)     │
         ├─────────────────────────────────►│ VM1
         ├─────────────────────────────────►│ VM2
         ├─────────────────────────────────►│ VM3
         └─────────────────────────────────►│ VM4
```

### Estructura de archivos

```
ansible/
├── ansible.cfg              — Configuración: usuario SSH, clave, inventario
├── inventory.ini            — Hosts con sus IPs (completar con terraform output)
├── group_vars/
│   └── all.yml              — Variables comunes (secretos se pasan con -e)
├── playbooks/
│   ├── site.yml             — Punto de entrada: llama a los dos playbooks
│   ├── app_vms.yml          — Provisiona VM1, VM2, VM4 (Docker + gcloud + .env)
│   └── db_vm.yml            — Provisiona VM3 (Docker + SQL files + PostgreSQL)
└── templates/
    ├── env_vm1.j2           — Plantilla .env para VM1
    ├── env_vm2.j2           — Plantilla .env para VM2
    ├── env_vm3.j2           — Plantilla .env para VM3
    └── env_vm4.j2           — Plantilla .env para VM4
```

---

## 5. Configuración paso a paso con Ansible

### Paso 1 — Instalar Ansible

```bash
pip install ansible
# O en Ubuntu/Debian:
sudo apt install ansible
```

### Paso 2 — Completar el inventario con las IPs de Terraform

```bash
# Obtener IPs
terraform -chdir=terraform output

# Editar ansible/inventory.ini y reemplazar los placeholders REEMPLAZAR_*
# con las IPs reales del output anterior
```

### Paso 3 — Completar las variables internas de inventario

En `ansible/inventory.ini`, también reemplazar los valores `REEMPLAZAR_VMX_INTERNAL_IP`
con las IPs internas obtenidas del output de Terraform.

### Paso 4 — Verificar conectividad SSH

```bash
cd ansible/
ansible all -m ping
```

Debe responder `pong` en las 4 VMs.

> **Captura sugerida:** salida del `ansible all -m ping` mostrando SUCCESS en los 4 hosts

### Paso 5 — Ejecutar el playbook

```bash
ansible-playbook playbooks/site.yml \
  -e "db_password=TuPasswordAqui" \
  -e "jwt_secret=TuJwtSecretAqui" \
  -e "email_user=correo@gmail.com" \
  -e "email_pass=tu_app_password" \
  -e "email_from=QuetzalTV"
```

Ansible ejecuta en orden:
1. `app_vms.yml` — configura VM1, VM2, VM4
2. `db_vm.yml` — configura VM3 y levanta los 7 contenedores PostgreSQL

El proceso toma aproximadamente 5-10 minutos.

> **Captura sugerida:** log de ejecución del playbook mostrando tareas en verde (ok) y amarillo (changed). Al final debe mostrar `PLAY RECAP` con 0 failures.

### Paso 6 — Verificar que las BDs están corriendo (en VM3)

```bash
ssh -i ~/.ssh/quetzaltv_deploy ubuntu@<VM3_EXTERNAL_IP>
docker ps
```

Deben aparecer 7 contenedores PostgreSQL corriendo.

> **Captura sugerida:** salida de `docker ps` en VM3 mostrando los 7 contenedores postgres en estado Up

---

## Secrets de GitHub a actualizar

Después de ejecutar Terraform y Ansible, actualizar los siguientes secrets en
**GitHub → Settings → Secrets and variables → Actions**:

| Secret | Valor | Cómo obtenerlo |
|---|---|---|
| `GCP_PROJECT_ID` | `sa-proyecto-g10-500320` | Fijo |
| `GCP_SA_KEY` | JSON de `quetzaltv-deploy` SA | Ver abajo |
| `GCS_SA_KEY` | JSON de `quetzal-tv-storage` SA | Ver abajo |
| `AR_REGION` | `us-central1` | Fijo |
| `GCS_BACKUP_BUCKET` | `quetzaltv-backups-sa-proyecto-g10-500320` | `terraform output backups_bucket_name` |
| `VM1_HOST` | IP externa de VM1 | `terraform output -raw vm1_external_ip` |
| `VM2_HOST` | IP externa de VM2 | `terraform output -raw vm2_external_ip` |
| `VM3_HOST` | IP externa de VM3 | `terraform output -raw vm3_external_ip` |
| `VM3_INTERNAL_IP` | IP interna de VM3 | `terraform output -raw vm3_internal_ip` |
| `VM4_HOST` | IP externa de VM4 | `terraform output -raw vm4_external_ip` |
| `VM_USER` | `ubuntu` | Fijo |
| `VM_SSH_KEY` | Contenido de `~/.ssh/quetzaltv_deploy` (privada) | `cat ~/.ssh/quetzaltv_deploy` |
| `GKE_CLUSTER` | `quetzaltv-cluster` | `terraform output -raw gke_cluster_name` |
| `GKE_ZONE` | `us-central1-a` | `terraform output -raw gke_cluster_zone` |
| `DB_PASSWORD` | Tu contraseña de PostgreSQL | El mismo valor que usaste en Ansible |
| `JWT_SECRET` | Tu JWT secret | El mismo valor que usaste en Ansible |
| `EMAIL_USER` | Correo para notificaciones | Igual que antes |
| `EMAIL_PASS` | App password del correo | Igual que antes |
| `EMAIL_FROM` | Nombre remitente | Igual que antes |
| `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub | Igual que antes |
| `DOCKERHUB_TOKEN` | Tu token de Docker Hub | Igual que antes |

### Exportar JSON keys de Service Accounts

```bash
# Key para deploy (CI/CD — GCP_SA_KEY)
gcloud iam service-accounts keys create /tmp/deploy-sa-key.json \
  --iam-account=quetzaltv-deploy@sa-proyecto-g10-500320.iam.gserviceaccount.com

# Key para storage (GCS signed URLs — GCS_SA_KEY)
gcloud iam service-accounts keys create /tmp/storage-sa-key.json \
  --iam-account=quetzal-tv-storage@sa-proyecto-g10-500320.iam.gserviceaccount.com

# Copiar el contenido de cada JSON al secret correspondiente en GitHub
cat /tmp/deploy-sa-key.json
cat /tmp/storage-sa-key.json
```
