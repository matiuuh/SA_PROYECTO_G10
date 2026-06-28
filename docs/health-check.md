# Health Check — Terraform · Ansible · Kubernetes

Referencia rápida para verificar el estado de la infraestructura de **Quetzal TV** desplegada en GCP.

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
kubectl get pods -n quetzaltv
kubectl get pods -n quetzaltv --watch       # monitoreo en vivo
```

### Verificar que no hubo cambios inesperados en deployments

```bash
kubectl get deployments -n quetzaltv
kubectl rollout status deployment/<nombre> -n quetzaltv
```

### Ver servicios y sus IPs/puertos expuestos

```bash
kubectl get services -n quetzaltv
kubectl get services --all-namespaces
```

### Ver ingress (puntos de entrada HTTP/HTTPS)

```bash
kubectl get ingress --all-namespaces
```

### Describir un recurso en detalle (útil para diagnosticar)

```bash
kubectl describe pod <nombre-pod> -n quetzaltv
kubectl describe deployment <nombre-deployment> -n quetzaltv
kubectl describe node <nombre-nodo>
```

### Ver logs de un pod

```bash
kubectl logs <nombre-pod> -n quetzaltv
kubectl logs <nombre-pod> -n quetzaltv --previous   # último crash
kubectl logs <nombre-pod> -n quetzaltv -f           # en vivo (follow)
```

### Uso de recursos (CPU y memoria)

```bash
kubectl top nodes
kubectl top pods -n quetzaltv
```

### Verificar ConfigMaps y Secrets (sin revelar valores)

```bash
kubectl get configmaps -n quetzaltv
kubectl get secrets -n quetzaltv
```

### Verificar que las imágenes en uso vienen del Artifact Registry correcto

```bash
kubectl get pods -n quetzaltv -o jsonpath="{.items[*].spec.containers[*].image}" | tr ' ' '\n'
```

Las imágenes deben empezar con `us-central1-docker.pkg.dev/sa-proyecto-g10-500320/quetzaltv/`.

### Verificar HPA (autoscaling horizontal) si está configurado

```bash
kubectl get hpa -n quetzaltv
```

---

## 4. Verificación rápida combinada

Secuencia de comandos para confirmar de un vistazo que todo está en pie:

```bash
# 1. Terraform — sin drift
terraform -chdir=terraform plan 2>&1 | tail -5

# 2. Ansible — todas las VMs responden
cd ansible && ansible all -m ping

# 3. Kubernetes — nodos y pods
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed
```

Si el último comando no devuelve nada (o solo muestra la cabecera), todos los pods están en estado correcto.

---

[Volver a la documentación](Documentación.md)
