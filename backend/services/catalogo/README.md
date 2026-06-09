# Servicio Catalogo

**Lenguaje:** Go 1.22  
**Puerto gRPC:** 5003  
**Puerto HTTP:** 8003  
**Base de datos:** PostgreSQL (base `catalogo`)

## Responsabilidades

- Películas y series: listado, búsqueda, filtrado por género
- Fichas técnicas con sinopsis, reparto, géneros
- Calificaciones (like / dislike) por perfil
- Cálculo del porcentaje global de recomendación
- Administración de contenido (CRUD para administradores)

## Estructura

```
catalogo/
├── cmd/server/main.go              ← entrada, wiring de dependencias
├── internal/
│   ├── domain/content.go           ← entidades + interfaz del repositorio
│   ├── application/service.go      ← casos de uso
│   ├── infrastructure/postgres/    ← implementacion PostgreSQL (pgx)
│   └── interfaces/grpc/handler.go  ← servidor gRPC (depende de make proto)
├── pkg/pb/catalogo/v1/             ← codigo generado por protoc (NO editar)
├── database/sql/
│   ├── 01_schema.sql               ← tablas, funciones, vistas, triggers
│   └── 02_procedures.sql           ← stored procedures transaccionales
├── go.mod
├── Makefile
└── Dockerfile
```

## Variables de entorno

| Variable      | Descripcion                         | Ejemplo                                          |
|---------------|-------------------------------------|--------------------------------------------------|
| `DATABASE_URL` | Connection string de PostgreSQL    | `postgres://user:pass@catalogo-db:5432/catalogo` |
| `GRPC_PORT`   | Puerto donde escucha el servidor gRPC | `5003` (por defecto)                          |
| `HTTP_PORT`   | Puerto donde escucha el servidor HTTP | `8003` (por defecto)                          |

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

Los scripts en `database/sql/` se ejecutan en orden al iniciar el contenedor PostgreSQL:

1. `01_schema.sql` — crea tablas, funciones, vistas e índices
2. `02_procedures.sql` — stored procedures:
   - `sp_registrar_contenido_completo` — crea contenido + géneros en una sola transacción
   - `sp_calificar_contenido` — upsert de calificacion por perfil

## Métodos gRPC

| Método                | Descripcion                              |
|-----------------------|------------------------------------------|
| `ListarContenido`     | Cartelera completa con % recomendacion   |
| `BuscarContenido`     | Búsqueda por título (ILIKE)              |
| `FiltrarContenido`    | Filtro por uno o varios géneros          |
| `ObtenerDetalle`      | Ficha técnica + reparto + calificaciones |
| `CalificarContenido`  | Like / dislike desde un perfil           |
| `CrearContenido`      | Alta de película o serie (admin)         |
| `ActualizarContenido` | Modificación de datos (admin)            |
| `EliminarContenido`   | Baja lógica (admin)                      |
