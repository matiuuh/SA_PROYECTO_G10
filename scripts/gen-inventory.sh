#!/usr/bin/env bash
# Genera ansible/inventory.ini con las IPs reales del output de Terraform.
# Ejecutar desde la raíz del repositorio:
#   bash scripts/gen-inventory.sh

set -e

TERRAFORM_DIR="terraform"
INVENTORY_FILE="ansible/inventory.ini"

echo "Leyendo outputs de Terraform..."

VM1_EXT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm1_external_ip)
VM1_INT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm1_internal_ip)
VM2_EXT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm2_external_ip)
VM2_INT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm2_internal_ip)
VM3_EXT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm3_external_ip)
VM3_INT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm3_internal_ip)
VM4_EXT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm4_external_ip)
VM4_INT=$(terraform -chdir="$TERRAFORM_DIR" output -raw vm4_internal_ip)

echo "VM1: ext=$VM1_EXT  int=$VM1_INT"
echo "VM2: ext=$VM2_EXT  int=$VM2_INT"
echo "VM3: ext=$VM3_EXT  int=$VM3_INT"
echo "VM4: ext=$VM4_EXT  int=$VM4_INT"

cat > "$INVENTORY_FILE" <<EOF
# Generado automáticamente por scripts/gen-inventory.sh
# No editar manualmente — volver a ejecutar el script si cambian las IPs

[vm_app]
vm1 ansible_host=${VM1_EXT}
vm2 ansible_host=${VM2_EXT}
vm4 ansible_host=${VM4_EXT}

[vm_db]
vm3 ansible_host=${VM3_EXT}

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/quetzaltv_deploy
ansible_python_interpreter=/usr/bin/python3

# IPs internas — usadas por las templates .env para conectar servicios entre VMs
vm1_internal_ip=${VM1_INT}
vm2_internal_ip=${VM2_INT}
vm3_internal_ip=${VM3_INT}
vm4_internal_ip=${VM4_INT}
EOF

echo ""
echo "✓ $INVENTORY_FILE actualizado correctamente."
echo ""
echo "Próximo paso — verificar conectividad SSH:"
echo "  cd ansible && ansible all -m ping"
