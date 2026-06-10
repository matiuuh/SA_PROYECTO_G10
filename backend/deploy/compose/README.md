# Docker Compose Local

Esta carpeta deja una base de trabajo local para el backend usando contenedores separados.

## Que levanta

- `postgres`: una sola instancia de PostgreSQL
- `redis`: cache local
- `usuario-service`: microservicio de autenticacion
- `catalogo-service`: catalogo por gRPC
- `streaming-service`: reproduccion por gRPC
- `suscripcion-service`: microservicio de planes y suscripciones
  - HTTP: `8002`
  - gRPC: `5002`
- `divisas-service`: tipos de cambio por gRPC
  - gRPC: `5005`
- `notificaciones-service`: correos y alertas por gRPC
  - gRPC: `5007`
- `cobros-service`: pagos por gRPC
  - gRPC: `5006`

## Como se maneja la base de datos

Para desarrollo local se usa:

- `1 contenedor PostgreSQL`
- `1 base de datos por microservicio`

Bases creadas al iniciar:

- `quetzal_usuario`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_suscripcion`
- `quetzal_divisas`
- `quetzal_cobros`
- `quetzal_notificaciones`

Esto les da separacion logica sin levantar demasiados contenedores.

## Script de usuarios

Al iniciar el contenedor de PostgreSQL se ejecuta:

- [01_usuarios.sql](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/services/usuario/database/sql/01_usuarios.sql)

Se cargan automaticamente las bases de:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`
- `divisas`
- `notificaciones`
- `cobros`

## Levantar el entorno

Desde esta carpeta:

```bash
docker compose up -d --build
```

## Bajar el entorno

```bash
docker compose down
```

Para borrar tambien los volumenes:

```bash
docker compose down -v
```

## Puertos

- PostgreSQL: `5432`
- Redis: `6379`
- Usuario service: `8001`
- Usuario gRPC: `5001`
- Suscripcion service: `8002`
- Suscripcion gRPC: `5002`
- Catalogo gRPC: `5003`
- Streaming gRPC: `5004`
- Divisas gRPC: `5005`
- Notificaciones gRPC: `5007`
- Cobros gRPC: `5006`

## Nota importante

- `usuario-service` ya queda configurado para usar PostgreSQL real con:

- `STORAGE_BACKEND=postgres`
- `DB_HOST=postgres`
- `DB_NAME=quetzal_usuario`

- `suscripcion-service` usa:

- `DB_HOST=postgres`
- `DB_NAME=quetzal_suscripcion`
