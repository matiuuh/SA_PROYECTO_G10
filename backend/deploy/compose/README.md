# Docker Compose Local

Esta carpeta deja una base de trabajo local para el backend usando contenedores separados.

## Que levanta

- `postgres`: una sola instancia de PostgreSQL
- `redis`: cache local
- `usuario-service`: microservicio de autenticacion

## Como se maneja la base de datos

Para desarrollo local se usa:

- `1 contenedor PostgreSQL`
- `1 base de datos por microservicio`

Bases creadas al iniciar:

- `quetzal_usuario`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_suscripcion`
- `quetzal_cobros`
- `quetzal_notificaciones`

Esto les da separacion logica sin levantar demasiados contenedores.

## Script de usuarios

Al iniciar el contenedor de PostgreSQL se ejecuta:

- [01_usuarios.sql](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/services/usuario/database/sql/01_usuarios.sql)

Por ahora solo se carga automaticamente la base del servicio `usuario`.

## Levantar el entorno

Desde esta carpeta:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

## Bajar el entorno

```bash
docker compose -f docker-compose.local.yml down
```

Para borrar tambien los volumenes:

```bash
docker compose -f docker-compose.local.yml down -v
```

## Puertos

- PostgreSQL: `5432`
- Redis: `6379`
- Usuario service: `8001`

## Nota importante

El `usuario-service` ya queda configurado para usar PostgreSQL real con:

- `STORAGE_BACKEND=postgres`
- `DB_HOST=postgres`
- `DB_NAME=quetzal_usuario`
