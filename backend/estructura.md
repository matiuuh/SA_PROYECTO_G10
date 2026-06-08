# Backend

Estructura base del backend de `Quetzal TV`, organizada por microservicio.

## Patron recomendado

Se recomienda trabajar con un enfoque de **arquitectura hexagonal / clean architecture ligera**:

- `domain/`: reglas de negocio y entidades
- `application/`: casos de uso
- `infrastructure/`: base de datos, clientes externos, Redis, gRPC, correo, pagos
- `interfaces/`: handlers HTTP/gRPC, DTOs, validaciones

La idea es que cada microservicio sea independiente, con su propio lenguaje, dependencias, base de datos y despliegue.

## Estructura

```text
backend/
├── api-gateway/
├── infra/
│   └── postgres/
│       └── init.sh          ← crea DBs y aplica schemas al iniciar el contenedor
├── proto/
│   ├── catalogo/v1/
│   ├── streaming/v1/
│   ├── usuario/v1/          ← pendiente
│   ├── suscripcion/v1/      ← pendiente
│   ├── divisas/v1/          ← pendiente
│   ├── cobros/v1/           ← pendiente
│   └── notificaciones/v1/   ← pendiente
├── services/
│   ├── catalogo/            ← Go 1.23, gRPC :5003
│   ├── streaming/           ← Go 1.23, gRPC :5004
│   ├── usuario/             ← Python, pendiente
│   ├── suscripcion/         ← Python, pendiente
│   ├── divisas/             ← TypeScript, pendiente
│   ├── cobros/              ← TypeScript, pendiente
│   └── notificaciones/      ← TypeScript, pendiente
├── deploy/
├── scripts/
└── sql/                     ← SQLs temporales, pendiente mover a cada servicio
```

El `docker-compose.local.yml` vive en la **raiz del proyecto** (no en `backend/`)
porque necesita `context: ./backend` para que los Dockerfiles accedan a `proto/` y `services/`.

## Criterio por lenguaje

### Python

Usar:

```text
service/
├── app/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── tests/
└── requirements.txt
```

Aplica bien para `usuario` y `suscripcion`.

### Go

Usar:

```text
service/
├── cmd/server/
├── internal/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── pkg/
│   └── pb/<servicio>/v1/   ← generado por protoc, NO subir al repo
└── tests/
```

Aplica bien para `catalogo` y `streaming`.

El Dockerfile de cada servicio Go:
- Usa `golang:1.23-alpine` como builder
- Recibe `context: ./backend` desde docker-compose
- Copia `services/<nombre>/` y `proto/` por separado
- Genera el proto con `--go_opt=module=quetzaltv/services/<nombre>`

### TypeScript

Usar:

```text
service/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── tests/
└── package.json
```

Aplica bien para `divisas`, `cobros` y `notificaciones`.

## Reglas practicas

- Compartir contratos solo en `proto/`, no compartir logica de negocio entre servicios.
- Cada servicio debe tener su propia carpeta `database/` con `sql/`, `migrations/` y `seed/`.
- El codigo generado por `protoc` (`pkg/pb/`) no se sube al repo — se genera en build time.
- El `api-gateway` debe ser el unico punto de entrada externo.
- Redis solo debe aparecer donde sea necesario (ej. `divisas`).

## Orden sugerido de trabajo

1. Definir `proto` por servicio.
2. Separar SQL por microservicio.
3. Crear esqueletos de cada servicio.
4. Implementar primero `usuario`, `catalogo` y `suscripcion`.
5. Luego integrar `cobros`, `notificaciones`, `divisas` y `streaming`.
