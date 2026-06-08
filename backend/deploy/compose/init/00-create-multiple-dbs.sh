#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE quetzal_usuario;
  CREATE DATABASE quetzal_catalogo;
  CREATE DATABASE quetzal_streaming;
  CREATE DATABASE quetzal_suscripcion;
  CREATE DATABASE quetzal_cobros;
  CREATE DATABASE quetzal_notificaciones;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "quetzal_usuario" \
  -f /docker-entrypoint-initdb.d/10-usuarios.sql
