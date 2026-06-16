#!/usr/bin/env bash
# bootstrap-vm.sh
# Ejecutar UNA SOLA VEZ en cada VM (vm1, vm2, vm3, vm4) antes del primer
# deploy vía cd-develop.yml. cd-develop.yml NO clona el repo ni crea el
# .env — solo actualiza AR_REGISTRY/IMAGE_TAG en un .env que asume ya
# existe. Este script prepara esa condición inicial.
#
# Uso (ejecutar como el usuario de deploy, ej. sa_deploy):
#   ./bootstrap-vm.sh <1|2|3|4>
#   GIT_PAT=<personal-access-token> ./bootstrap-vm.sh <1|2|3|4>   # si el repo es privado
#
# Después de correrlo:
#   1. Editar /opt/quetzaltv/backend/deploy/compose/.env con los valores reales.
#   2. Solo en VM3: docker compose -f backend/deploy/compose/docker-compose.cloud-vm3.yml up -d

set -euo pipefail

VM_NUM="${1:?Uso: ./bootstrap-vm.sh <1|2|3|4>}"
REPO_URL="https://github.com/matiuuh/SA_PROYECTO_G10.git"
TARGET="/opt/quetzaltv"

if [ -d "${TARGET}/.git" ]; then
  echo "→ ${TARGET} ya existe, actualizando con git pull..."
  git -C "${TARGET}" pull
else
  echo "→ Clonando repo en ${TARGET}..."
  sudo mkdir -p "${TARGET}"
  sudo chown "$(id -u):$(id -g)" "${TARGET}"
  if [ -n "${GIT_PAT:-}" ]; then
    git clone "https://${GIT_PAT}@github.com/matiuuh/SA_PROYECTO_G10.git" "${TARGET}"
  else
    git clone "${REPO_URL}" "${TARGET}"
  fi
fi

ENV_FILE="${TARGET}/backend/deploy/compose/.env"
ENV_EXAMPLE="${TARGET}/backend/deploy/compose/.env.vm${VM_NUM}.example"

if [ -f "${ENV_FILE}" ]; then
  echo "→ ${ENV_FILE} ya existe, no se sobreescribe."
else
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  echo "→ Creado ${ENV_FILE} desde la plantilla."
  echo "  EDÍTALO ahora con los valores reales: nano ${ENV_FILE}"
fi

mkdir -p "${TARGET}/secrets"

echo "✓ Bootstrap de VM${VM_NUM} completo."
if [ "${VM_NUM}" = "3" ]; then
  echo "  Siguiente paso (solo VM3): levantar las bases de datos por primera vez:"
  echo "    cd ${TARGET} && docker compose -f backend/deploy/compose/docker-compose.cloud-vm3.yml up -d"
fi
