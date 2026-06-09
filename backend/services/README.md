# Servicios Backend

Esta carpeta contiene los microservicios principales del backend de `Quetzal TV`.

## Estado actual

Los servicios que ya quedaron implementados y probados en entorno local son:

- `usuario`
- `suscripcion`
- `catalogo`
- `streaming`
- `divisas`
- `cobros`
- `notificaciones`

## Puertos

| Servicio | Tipo | Puerto |
| --- | --- | --- |
| `usuario` | HTTP | `8001` |
| `usuario` | gRPC | `5001` |
| `suscripcion` | HTTP | `8002` |
| `suscripcion` | gRPC | `5002` |
| `catalogo` | gRPC | `5003` |
| `streaming` | gRPC | `5004` |
| `divisas` | gRPC | `5005` |
| `cobros` | gRPC | `5006` |
| `notificaciones` | gRPC | `5007` |

## Servicios HTTP

### `usuario`

Base URL:

- `http://localhost:8001`

Swagger:

- `http://localhost:8001/docs`

Endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /health`

### `suscripcion`

Base URL:

- `http://localhost:8002`

Swagger:

- `http://localhost:8002/docs`

Endpoints:

- `GET /api/v1/plans`
- `POST /api/v1/plans`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions/account/{cuenta_id}`
- `POST /api/v1/subscriptions/{suscripcion_id}/cancel`
- `GET /health`

## Servicios gRPC

### `usuario`

Proto:

- [usuario.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/usuario/v1/usuario.proto)

Metodos:

- `ValidateToken`
- `GetAccountById`
- `GetAccountByEmail`

### `suscripcion`

Proto:

- [suscripcion.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/suscripcion/v1/suscripcion.proto)

Metodos:

- `ListPlans`
- `CreatePlan`
- `CreateSubscription`
- `GetSubscriptionByAccount`
- `CancelSubscription`

### `catalogo`

Proto:

- [catalogo.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/catalogo/v1/catalogo.proto)

Metodos:

- `ListarContenido`
- `BuscarContenido`
- `FiltrarContenido`
- `ObtenerDetalle`
- `CalificarContenido`
- `CrearContenido`
- `ActualizarContenido`
- `EliminarContenido`

Nota:

- `catalogo` guarda actualmente `url_trailer` para el trailer del contenido.

### `streaming`

Proto:

- [streaming.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/streaming/v1/streaming.proto)

Metodos:

- `ActualizarProgreso`
- `ObtenerProgreso`
- `ObtenerHistorial`

Nota:

- `streaming` usa `perfil_id` con formato `UUID`.

### `divisas`

Proto:

- [divisas.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/divisas/v1/divisas.proto)

Metodos:

- `ObtenerTipoCambio`
- `ConvertirMonto`
- `ListarMonedas`

### `cobros`

Proto:

- [cobros.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/cobros/v1/cobros.proto)

Metodos:

- `ProcesarPago`
- `ObtenerTransaccion`
- `ListarTransacciones`
- `ObtenerRecibo`

Nota:

- `cobros` ya consume `divisas`
- `cobros` ya dispara `notificaciones` cuando un pago queda aprobado

### `notificaciones`

Proto:

- [notificaciones.proto](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/proto/notificaciones/v1/notificaciones.proto)

Metodos:

- `EnviarConfirmacionRegistro`
- `EnviarRecibo`
- `EnviarAlertaNuevaPublicacion`

## Levantar todo el backend

Desde:

- [backend/deploy/compose](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/deploy/compose)

Comando:

```powershell
docker compose up -d --build
```

Para revisar contenedores:

```powershell
docker compose ps
```

Si cambias scripts SQL de inicializacion y necesitas recrear PostgreSQL desde cero:

```powershell
docker compose down -v
docker compose up -d --build
```

## Recomendacion de consumo

Para frontend, lo mas natural ahorita es consumir primero:

- `usuario` por HTTP
- `suscripcion` por HTTP

Y dejar como servicios internos por gRPC:

- `catalogo`
- `streaming`
- `divisas`
- `cobros`
- `notificaciones`
