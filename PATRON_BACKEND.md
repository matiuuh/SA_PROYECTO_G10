# Patron de Arquitectura y Estructura de Carpetas

Este documento describe el patron de organizacion propuesto para el backend de `Quetzal TV`.

## Objetivo

El proyecto usa varios lenguajes y varios microservicios, por lo que conviene separar el backend de forma que:

- cada servicio sea independiente
- cada integrante pueda trabajar sin interferir con los demas
- la logica de negocio no quede mezclada con base de datos, gRPC o integraciones externas
- sea facil escalar, probar y desplegar cada servicio

## Enfoque propuesto

Se propone una combinacion de:

- **arquitectura por microservicios**
- **organizacion vertical por servicio**
- **clean architecture ligera** dentro de cada microservicio

Esto significa que primero se separa por servicio:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`
- `divisas`
- `cobros`
- `notificaciones`

Y luego, dentro de cada uno, se organiza por responsabilidades:

- `domain`: entidades y reglas de negocio
- `application`: casos de uso
- `infrastructure`: persistencia, Redis, correo, clientes externos
- `interfaces`: handlers, controladores, DTOs, gRPC, HTTP

## Por que este patron encaja bien aqui

Este proyecto no usa un solo stack, sino varios:

- Python
- Go
- TypeScript

Si se mezclara todo por tipo de tecnologia globalmente, el repositorio se volveria dificil de mantener. En cambio, si cada microservicio vive en su propia carpeta:

- cada servicio puede tener sus propias dependencias
- cada servicio puede tener su propia base de datos
- cada servicio puede desplegarse por separado
- los cambios en un servicio afectan menos a los otros

## Estructura general del backend

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

## Estructura interna por lenguaje

### 1. Servicios en Python

Aplica a:

- `usuario`
- `suscripcion`

Estructura sugerida:

```text
service/
├── app/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── database/
│   ├── sql/
│   ├── migrations/
│   └── seed/
└── tests/
```

### 2. Servicios en Go

Aplica a:

- `catalogo`
- `streaming`

Estructura sugerida:

```text
service/
├── cmd/server/
├── internal/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── pkg/
├── database/
│   ├── sql/
│   ├── migrations/
│   └── seed/
└── tests/
```

### 3. Servicios en TypeScript

Aplica a:

- `divisas`
- `cobros`
- `notificaciones`

Estructura sugerida:

```text
service/
├── src/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── interfaces/
├── database/
│   ├── sql/
│   ├── migrations/
│   └── seed/
└── tests/
```

## Significado de cada capa

### `domain`

Aqui va el nucleo del negocio:

- entidades
- value objects
- reglas del dominio
- validaciones de negocio

Ejemplo:

- un perfil no puede pertenecer a otra cuenta
- una suscripcion cancelada no puede cobrarse de nuevo

### `application`

Aqui van los casos de uso del sistema:

- registrar usuario
- iniciar sesion
- contratar plan
- registrar pago
- enviar notificacion

Esta capa coordina el flujo, pero no debe conocer detalles tecnicos concretos.

### `infrastructure`

Aqui van los adaptadores tecnicos:

- repositorios SQL
- acceso a PostgreSQL
- acceso a Redis
- clientes gRPC
- proveedores de correo
- pasarelas de pago

### `interfaces`

Aqui van las entradas y salidas del servicio:

- controladores HTTP
- handlers gRPC
- mapeos de request/response
- DTOs

## Contratos entre servicios

Todos los contratos compartidos deben vivir en:

```text
backend/proto/
```

Regla recomendada:

- `common/` para mensajes reutilizables
- `<servicio>/v1/` para contratos del servicio

Esto permite:

- versionar interfaces
- evitar dependencias directas entre implementaciones
- mantener desacoplados los microservicios

## Base de datos

Cada microservicio debe tener su propia base de datos o al menos su propio esquema aislado segun la estrategia del equipo.

Dentro de cada servicio se dejo esta estructura:

- `database/sql/`
- `database/migrations/`
- `database/seed/`

Uso sugerido:

- `sql/`: scripts de diseno inicial
- `migrations/`: cambios versionados
- `seed/`: datos de prueba o catalogos base

## API Gateway

`backend/api-gateway/` queda reservado para el unico punto de entrada externo.

Su responsabilidad ideal es:

- recibir peticiones del frontend
- validar autenticacion general
- redirigir a microservicios internos
- unificar respuestas cuando sea necesario

No deberia contener la logica principal del negocio.

## Ventajas de esta organizacion

- mejora el reparto de trabajo del equipo
- reduce conflictos al hacer merge
- mantiene separadas las responsabilidades
- facilita las pruebas
- hace mas claro que archivos pertenecen a cada servicio
- prepara el proyecto para Docker, CI/CD y despliegue individual

## Orden recomendado de implementacion

1. Definir contratos `proto` por servicio.
2. Separar los scripts SQL actuales dentro de cada microservicio.
3. Implementar primero `usuario`, `suscripcion` y `catalogo`.
4. Conectar luego `cobros`, `notificaciones`, `divisas` y `streaming`.
5. Integrar finalmente el `api-gateway`.

## Nota practica para el equipo

Si quieren avanzar rapido sin perder orden:

- asignen un microservicio por integrante o por pareja
- definan primero el contrato `proto`
- luego construyan base de datos
- despues implementen casos de uso
- al final conecten integraciones externas

Este patron busca que el proyecto sea entendible, mantenible y facil de repartir entre todos.
