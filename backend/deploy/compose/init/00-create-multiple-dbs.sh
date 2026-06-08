#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
  CREATE DATABASE quetzal_usuario;
  CREATE DATABASE quetzal_catalogo;
  CREATE DATABASE quetzal_streaming;
  CREATE DATABASE quetzal_suscripcion;
  CREATE DATABASE quetzal_divisas;
  CREATE DATABASE quetzal_cobros;
  CREATE DATABASE quetzal_notificaciones;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_usuario" \
  -f /init-scripts/10-usuarios.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_suscripcion" \
  -f /init-scripts/20-suscripciones.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_catalogo" \
  -f /init-scripts/30-catalogo-schema.sql \
  -f /init-scripts/31-catalogo-procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_streaming" \
  -f /init-scripts/40-streaming-schema.sql \
  -f /init-scripts/41-streaming-procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_divisas" \
  -f /init-scripts/45-divisas-schema.sql \
  -f /init-scripts/46-divisas-procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_notificaciones" \
  -f /init-scripts/47-notificaciones-schema.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_cobros" \
  -f /init-scripts/50-cobros-schema.sql
