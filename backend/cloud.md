# Despliegue del Backend en GCP

Este documento resume una estrategia practica para desplegar el backend de `Quetzal TV` en `Google Cloud Platform (GCP)`.

## Idea principal

Hay que separar dos cosas:

- los `microservicios`
- las `bases de datos`

No necesariamente se despliegan igual.

## Que si se dockeriza

Los microservicios si deben ir en contenedores Docker:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`
- `divisas`
- `cobros`
- `notificaciones`
- `api-gateway`

Cada uno deberia tener su propio `Dockerfile`.

## Que no necesariamente se dockeriza en produccion

Las bases de datos no tienen que correr en Docker en la nube.

En produccion, lo mas recomendable es usar un servicio administrado:

- `Cloud SQL for PostgreSQL`

Eso evita que ustedes tengan que encargarse manualmente de:

- respaldos
- actualizaciones
- monitoreo
- reinicios
- alta disponibilidad

## Recomendacion para este proyecto

### Desarrollo local

En local si conviene usar Docker Compose:

- microservicios en contenedores
- PostgreSQL en contenedor
- Redis en contenedor

Esto les permite levantar todo rapido y probar integracion.

### Produccion en GCP

En la nube, la recomendacion mas practica para ustedes es:

- microservicios desplegados como contenedores
- bases de datos en `Cloud SQL`
- Redis en `Memorystore` si quieren hacerlo bien, o Redis en contenedor si necesitan simplificar

## Como manejar las bases de datos

Tienen dos opciones razonables:

### Opcion 1. Una sola instancia de PostgreSQL y una base por microservicio

Ejemplo:

- `quetzal_usuario`
- `quetzal_suscripcion`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_cobros`
- `quetzal_notificaciones`

Ventajas:

- mas barato
- mas facil de administrar
- suficiente para un proyecto universitario

Esta es la opcion que mas les recomiendo.

### Opcion 2. Una instancia de Cloud SQL por microservicio

Ventajas:

- mejor aislamiento

Desventajas:

- mas caro
- mas complejo
- demasiado para una primera entrega

## Recomendacion concreta

Para este proyecto en GCP:

- `1 instancia de Cloud SQL PostgreSQL`
- `1 base de datos por microservicio`
- `1 Redis compartido` si lo necesitan
- `1 contenedor por microservicio`

Eso mantiene la separacion logica sin complicar demasiado el costo ni la administracion.

## Opciones para desplegar los contenedores

### Opcion recomendada para estudiantes: VM con Docker Compose

Pueden usar una `Compute Engine VM` y desplegar todo ahi con Docker.

Flujo:

1. Crear una VM en GCP.
2. Instalar Docker y Docker Compose.
3. Clonar el repositorio.
4. Configurar variables de entorno.
5. Ejecutar `docker compose -f docker-compose.cloud.yml up -d --build`.

Ventajas:

- simple
- rapido de entender
- facil de presentar
- menos curva de aprendizaje

Desventajas:

- menos escalable
- mas manual

### Opcion mas cloud: Cloud Run

Cada microservicio se despliega como servicio independiente en `Cloud Run`.

Ventajas:

- despliegue mas moderno
- escalado automatico
- menos mantenimiento de servidores

Desventajas:

- requiere mas configuracion
- integrar multiples servicios puede costarles mas tiempo

Si el tiempo es corto, mejor `Compute Engine + Docker Compose`.

## Arquitectura sugerida para ustedes

### Variante simple

- `Compute Engine` para contenedores
- `Cloud SQL` para PostgreSQL
- `Redis` en contenedor o `Memorystore`

### Variante mas formal

- `Cloud Run` para contenedores
- `Cloud SQL` para PostgreSQL
- `Memorystore` para Redis
- `Artifact Registry` para imagenes Docker

## Donde vive cada cosa

- codigo del backend: repositorio Git
- imagenes Docker: `Artifact Registry` o build local en VM
- microservicios: `Compute Engine` o `Cloud Run`
- bases de datos: `Cloud SQL`
- cache Redis: `Memorystore` o contenedor
- secretos: variables de entorno o `Secret Manager`

## Flujo de despliegue simple en VM

El flujo mas sencillo seria:

1. SSH a la VM.
2. Hacer `git pull`.
3. Crear o actualizar el archivo `.env`.
4. Ejecutar:

```bash
docker compose -f docker-compose.cloud.yml up -d --build
```

## Variables de entorno

Nunca deben ir credenciales reales en el repositorio.

Ejemplos de variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASSWORD`

## Regla importante de arquitectura

Aunque varias bases esten dentro de la misma instancia de `Cloud SQL`, los servicios no deben:

- leer tablas de otro servicio
- escribir directo en la base de otro servicio

Si un servicio necesita informacion de otro, debe pedirla por:

- `gRPC`
- o a traves del `api-gateway`, segun el flujo definido

## Recomendacion final

Para avanzar sin complicarse demasiado:

- en `local`: Docker Compose con todo containerizado
- en `cloud`: microservicios en contenedores y PostgreSQL en `Cloud SQL`
- usar `una base por microservicio`
- evitar meter PostgreSQL en Docker en produccion, salvo que el curso lo exija

## Conclusion

No, la base de datos no tiene que desplegarse obligatoriamente en Docker en GCP.

Lo normal y recomendable es:

- `servicios` dockerizados
- `base de datos` administrada en `Cloud SQL`

Eso les da una arquitectura mas limpia, mas realista y mas facil de sostener.
