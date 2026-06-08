#!/usr/bin/env bash
# Crea las bases de datos y aplica los schemas de cada servicio.
# Este script es ejecutado por el entrypoint de postgres:16-alpine
# la primera vez que el volumen esta vacio.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE catalogo_db;
    CREATE DATABASE streaming_db;
    CREATE DATABASE divisas_db;
    CREATE DATABASE cobros_db;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=catalogo_db \
    -f /docker-entrypoint-initdb.d/catalogo/01_schema.sql \
    -f /docker-entrypoint-initdb.d/catalogo/02_procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=streaming_db \
    -f /docker-entrypoint-initdb.d/streaming/01_schema.sql \
    -f /docker-entrypoint-initdb.d/streaming/02_procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=divisas_db \
    -f /docker-entrypoint-initdb.d/divisas/01_schema.sql \
    -f /docker-entrypoint-initdb.d/divisas/02_procedures.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=cobros_db \
    -f /docker-entrypoint-initdb.d/cobros/01_schema.sql
