#!/usr/bin/env bash
# backup-databases.sh
# Ejecutar en VM3. Vuelca las 7 BDs de PostgreSQL y los sube a GCS.
#
# Uso:
#   GCS_BACKUP_BUCKET=mi-bucket ./backup-databases.sh
#
# Variables de entorno requeridas:
#   GCS_BACKUP_BUCKET — nombre del bucket GCS (sin gs://)
# Variables opcionales:
#   DB_USER           — usuario de postgres (default: postgres)

set -euo pipefail

DB_USER="${DB_USER:-postgres}"
DATE=$(date +%Y%m%d_%H%M%S)
BUCKET="${GCS_BACKUP_BUCKET:?La variable GCS_BACKUP_BUCKET no está definida}"

if ! command -v gsutil &>/dev/null; then
  echo "ERROR: gsutil no está instalado. Instalar google-cloud-sdk." >&2
  exit 1
fi

backup_db() {
  local DB_NAME=$1
  local CONTAINER=$2
  local DUMP_FILE="/tmp/backup_${DB_NAME}_${DATE}.sql.gz"

  echo "→ Respaldando ${DB_NAME} desde ${CONTAINER}..."
  docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" \
    | gzip > "${DUMP_FILE}"

  gsutil cp "${DUMP_FILE}" "gs://${BUCKET}/backups/${DATE}/${DB_NAME}.sql.gz"
  rm "${DUMP_FILE}"
  echo "  ✓ ${DB_NAME} → gs://${BUCKET}/backups/${DATE}/${DB_NAME}.sql.gz"
}

echo "================================================================"
echo "  QuetzalTV — Backup de bases de datos"
echo "  Fecha: ${DATE}"
echo "  Destino: gs://${BUCKET}/backups/${DATE}/"
echo "================================================================"

backup_db "quetzal_usuario"        "quetzal-postgres-usuario"
backup_db "quetzal_suscripcion"    "quetzal-postgres-suscripcion"
backup_db "quetzal_catalogo"       "quetzal-postgres-catalogo"
backup_db "quetzal_streaming"      "quetzal-postgres-streaming"
backup_db "quetzal_divisas"        "quetzal-postgres-divisas"
backup_db "quetzal_cobros"         "quetzal-postgres-cobros"
backup_db "quetzal_notificaciones" "quetzal-postgres-notificaciones"

echo "================================================================"
echo "  Backup completo: ${DATE}"
echo "================================================================"
