# Contexto del backend - Quetzal TV

## Division de trabajo

| Desarrollador | Servicios asignados |
|---------------|---------------------|
| Mateo (202203009) | `catalogo` (Go), `streaming` (Go) |
| Companero | `usuario` (Python), `suscripcion` (Python) |
| Segunda ronda | `cobros`, `notificaciones`, `divisas` (TypeScript) |

## Estado actual

| Servicio | SQL | Proto | Implementacion | Dockerfile | Compose |
|----------|-----|-------|----------------|------------|---------|
| `usuario` | si | si | si | si | si |
| `suscripcion` | si | si | si | si | si |
| `catalogo` | si | si | si | si | si |
| `streaming` | si | si | si | si | si |
| `divisas` | pendiente | pendiente | esqueleto | no | no |
| `cobros` | base SQL | pendiente | esqueleto | no | no |
| `notificaciones` | base SQL | pendiente | esqueleto | no | no |

## Puertos gRPC

| Servicio | Puerto |
|----------|--------|
| usuario | 5001 |
| suscripcion | 5002 |
| catalogo | 5003 |
| streaming | 5004 |
| divisas | 5005 |
| cobros | 5006 |
| notificaciones | 5007 |

## Puertos HTTP actuales

| Servicio | Puerto |
|----------|--------|
| usuario | 8001 |
| suscripcion | 8002 |

## Como levantar el entorno local

El archivo principal es:

- `backend/deploy/compose/docker-compose.local.yml`

Debe ejecutarse desde:

- `backend/deploy/compose/`

Comandos utiles:

```bash
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml down -v
```

## Bases de datos locales

El script:

- `backend/deploy/compose/init/00-create-multiple-dbs.sh`

crea estas bases:

- `quetzal_usuario`
- `quetzal_suscripcion`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_cobros`
- `quetzal_notificaciones`

Y aplica automaticamente los SQL de:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`

## Contratos gRPC

Los `.proto` viven en:

- `backend/proto/<servicio>/v1/`

Actualmente existen:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`

## Convenciones importantes

- Arquitectura por microservicios
- Database per Microservice
- Comunicacion entre servicios por `gRPC`
- El frontend y pruebas manuales pueden seguir usando `HTTP`
- No compartir tablas entre servicios
- Compartir solo identificadores como `cuenta_id`, `perfil_id`, `plan_id`, `contenido_id`

## Flujo de integracion esperado

- `usuario` es fuente de verdad de cuentas, autenticacion y sesiones
- `suscripcion` administra planes y suscripciones por `cuenta_id`
- `catalogo` administra contenido y calificaciones por `perfil_id`
- `streaming` administra progreso de reproduccion por `perfil_id`
- `cobros` debe integrarse con `suscripcion` y `divisas`
- `notificaciones` debe reaccionar a eventos de `usuario`, `cobros` y `catalogo`
