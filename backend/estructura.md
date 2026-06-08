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
├── proto/
│   ├── common/
│   ├── usuario/v1/
│   ├── suscripcion/v1/
│   ├── catalogo/v1/
│   ├── streaming/v1/
│   ├── divisas/v1/
│   ├── cobros/v1/
│   └── notificaciones/v1/
├── services/
│   ├── usuario/
│   ├── suscripcion/
│   ├── catalogo/
│   ├── streaming/
│   ├── divisas/
│   ├── cobros/
│   └── notificaciones/
├── deploy/
│   ├── docker/
│   └── compose/
├── scripts/
└── sql/
```

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
└── tests/
```

Aplica bien para `catalogo` y `streaming`.

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
- `sql/` puede quedarse por ahora como carpeta temporal de diseno, pero luego conviene mover cada script a su servicio.
- El `api-gateway` debe ser el unico punto de entrada externo.
- Redis solo debe aparecer donde sea necesario, por ejemplo `divisas`.

## Orden sugerido de trabajo

1. Definir `proto` por servicio.
2. Separar SQL por microservicio.
3. Crear esqueletos de cada servicio.
4. Implementar primero `usuario`, `catalogo` y `suscripcion`.
5. Luego integrar `cobros`, `notificaciones`, `divisas` y `streaming`.
