# Despliegue en nube — Quetzal TV

## Flujo de despliegue (produccion)

```
1. SSH a la VM
2. git pull del repo
3. Crear/actualizar el .env con los secretos
4. docker compose -f docker-compose.cloud.yml up -d --build
```

## Archivos Docker Compose

| Archivo                     | Uso                        |
|-----------------------------|----------------------------|
| `docker-compose.local.yml`  | Desarrollo local           |
| `docker-compose.cloud.yml`  | Produccion en nube (GCP)   |

Ambos viven en la **raiz del proyecto**.

## Diferencias local vs cloud

| Aspecto            | Local                              | Cloud                                      |
|--------------------|------------------------------------|--------------------------------------------|
| Postgres           | Contenedor unico, 2 DBs            | Instancia Cloud SQL por microservicio      |
| Puertos expuestos  | Todos (debug)                      | Solo API Gateway al exterior               |
| Variables de entorno | `.env` en disco                  | Secret Manager / variables de entorno en VM|
| Build              | `--build` en cada deploy           | Imagen pre-buildeada en Artifact Registry  |
| Restart            | `unless-stopped`                   | `always`                                   |

## Variables de entorno requeridas por servicio

### catalogo
```
DATABASE_URL=postgres://<user>:<pass>@<host>:5432/catalogo_db?sslmode=require
GRPC_PORT=5003
```

### streaming
```
DATABASE_URL=postgres://<user>:<pass>@<host>:5432/streaming_db?sslmode=require
GRPC_PORT=5004
```

> Los secretos (usuarios, passwords, IPs) nunca van en el repositorio. Solo en `.env` o en el gestor de secretos del proveedor cloud.

## Notas de build

Los Dockerfiles de los servicios Go usan `golang:1.23-alpine` como builder y esperan que el **contexto de build sea `backend/`**. Esto es porque el Dockerfile accede a:
- `services/<nombre>/` — codigo del servicio
- `proto/` — contratos gRPC

El `docker-compose.cloud.yml` debe definir `context: ./backend` igual que el local.
