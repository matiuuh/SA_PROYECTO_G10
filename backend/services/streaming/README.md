# Servicio Streaming

**Lenguaje:** Go 1.22  
**Puerto gRPC:** 5004  
**Base de datos:** PostgreSQL (base `streaming`)

## Responsabilidades

- Guardar y actualizar el progreso de reproducción por perfil
- Marcar contenido como finalizado cuando el progreso >= 90%
- Permitir reanudar desde el último punto guardado
- Exponer el historial reciente de un perfil

## Estructura

```
streaming/
├── cmd/server/main.go              ← entrada, wiring de dependencias
├── internal/
│   ├── domain/playback.go          ← entidad PlaybackHistory + interfaz repositorio
│   ├── application/service.go      ← casos de uso
│   ├── infrastructure/postgres/    ← implementacion PostgreSQL (pgx)
│   └── interfaces/grpc/handler.go  ← servidor gRPC (depende de make proto)
├── pkg/pb/streaming/v1/            ← codigo generado por protoc (NO editar)
├── database/sql/
│   ├── 01_schema.sql               ← tablas, funciones, vistas, triggers
│   └── 02_procedures.sql           ← stored procedure principal
├── go.mod
├── Makefile
└── Dockerfile
```

## Variables de entorno

| Variable       | Descripcion                         | Ejemplo                                            |
|----------------|-------------------------------------|----------------------------------------------------|
| `DATABASE_URL` | Connection string de PostgreSQL     | `postgres://user:pass@streaming-db:5432/streaming` |
| `GRPC_PORT`    | Puerto donde escucha el servidor    | `5004` (por defecto)                               |

## Primeros pasos (desarrollo local)

```bash
# 1. Instalar protoc y plugins de Go
brew install protobuf
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 2. Generar codigo proto
make proto

# 3. Descargar dependencias
make tidy

# 4. Compilar y ejecutar
DATABASE_URL="postgres://..." make run
```

## SQL

1. `01_schema.sql` — crea tablas, funciones, vistas e índices
2. `02_procedures.sql` — stored procedure:
   - `sp_upsert_progreso` — inserta o actualiza el progreso; determina estado automáticamente

## Métodos gRPC

| Método                | Descripcion                                            |
|-----------------------|--------------------------------------------------------|
| `ActualizarProgreso`  | Guarda / actualiza segundos vistos y estado            |
| `ObtenerProgreso`     | Devuelve el progreso guardado para reanudar            |
| `ObtenerHistorial`    | Lista el historial reciente de un perfil               |

## Nota sobre `episodio_id`

- Películas: enviar `episodio_id = ""` (string vacío). El servicio lo trata como NULL.
- Series: enviar el UUID del episodio correspondiente.

La restricción `UNIQUE (perfil_id, contenido_id, episodio_id)` garantiza un registro por recurso por perfil.
