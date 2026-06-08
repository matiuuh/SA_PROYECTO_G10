# Contexto del backend — Quetzal TV

## Division de trabajo (backend)

| Desarrollador | Servicios asignados                            |
|---------------|------------------------------------------------|
| **Mateo** (202203009) | `catalogo` (Go), `streaming` (Go)   |
| **Compañero** | `usuario` (Python), `suscripcion` (Python)     |
| Segunda ronda | `cobros`, `notificaciones`, `divisas` (TypeScript) |

## Estado actual

| Servicio    | SQL | Proto | Go (domain) | Go (app) | Go (infra) | Go (grpc) | Dockerfile | Docker Compose |
|-------------|-----|-------|-------------|----------|------------|-----------|------------|----------------|
| `catalogo`  | ✅  | ✅    | ✅          | ✅       | ✅         | ✅        | ✅         | ✅             |
| `streaming` | ✅  | ✅    | ✅          | ✅       | ✅         | ✅        | ✅         | ✅             |
| `usuario`   | ✅* | —     | —           | —        | —          | —         | —          | —              |
| `suscripcion` | ✅* | —   | —           | —        | —          | —         | —          | —              |

*SQL del compañero en `backend/sql/` — pendiente de mover a `services/<nombre>/database/sql/`.

## Puertos gRPC asignados

| Servicio        | Puerto |
|-----------------|--------|
| usuario         | 5001   |
| suscripcion     | 5002   |
| catalogo        | 5003   |
| streaming       | 5004   |
| divisas         | 5005   |
| cobros          | 5006   |
| notificaciones  | 5007   |

## Como levantar con Docker Compose (recomendado)

El `docker-compose.local.yml` en la raiz del proyecto orquesta Postgres + los servicios Go.
El contexto de build es `backend/`, por lo que debe correrse desde la raiz:

```bash
# Levantar todo (postgres + catalogo + streaming)
docker compose -f docker-compose.local.yml up --build

# Solo la base de datos (util para correr servicios localmente con make run)
docker compose -f docker-compose.local.yml up postgres

# Reconstruir solo un servicio
docker compose -f docker-compose.local.yml up --build catalogo

# Apagar y eliminar volumenes (reset de DB)
docker compose -f docker-compose.local.yml down -v
```

La DB se inicializa automaticamente con `backend/infra/postgres/init.sh`:
crea `catalogo_db` y `streaming_db`, y aplica los schemas en orden.

## Como levantar un servicio en local (sin Docker)

```bash
cd backend/services/<nombre>
make proto        # genera pkg/pb/ (requiere protoc + plugins instalados)
make tidy         # go mod tidy
DATABASE_URL="postgres://user:pass@localhost:5432/<db>" make run
```

## Requerimientos para generar proto (desarrollo local)

Los servicios Go usan **Go 1.23**. Los plugins de protoc deben instalarse con Go 1.23+:

```bash
# Versiones pineadas — compatibles con Go 1.23 y con las deps del go.mod
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.1
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

# protobuf compiler
brew install protobuf          # macOS
apt install -y protobuf-compiler  # Linux
```

> No usar `@latest`: protoc-gen-go v1.36+ requiere Go 1.23 y protoc-gen-go-grpc v1.6+ requiere Go 1.25. Las versiones pineadas son las que usa el Dockerfile.

## Contratos gRPC (proto)

Los archivos `.proto` viven en `backend/proto/<servicio>/v1/`.  
El codigo generado va dentro de cada servicio en `pkg/pb/<servicio>/v1/` — **no se sube al repo**, se genera con `make proto`.

El flag de generacion es `--go_opt=module=quetzaltv/services/<nombre>` (no `paths=source_relative`).
Esto asegura que el codigo quede en `pkg/pb/...` tal como lo importa el codigo fuente.

## Convenciones

- Arquitectura hexagonal: `domain` → `application` → `infrastructure` / `interfaces`
- Variables sensibles solo en `.env`, nunca en codigo ni Dockerfile
- Eliminacion logica (`eliminado_en`) — nunca DELETE fisico en contenidos
- Auditoria automatica via tabla `instantaneas` + triggers
- Stored procedures para operaciones transaccionales (requerimiento del curso)
