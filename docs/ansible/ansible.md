# Configuración de Infraestructura

## Índice

1. [Terraform — Qué es y cómo funciona](#1-terraform--qué-es-y-cómo-funciona)
2. [Infraestructura declarada](#2-infraestructura-declarada)
3. [Configuración paso a paso con Terraform](#3-configuración-paso-a-paso-con-terraform)
4. [Ansible — Qué es y cómo funciona](#4-ansible--qué-es-y-cómo-funciona)

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

[Volver a la documentacion](../Documentación.md)