# Casos de Uso

## Core del negocio
| Representación | Actor | Descripción |
|----|-------------|-------------|
|![Cliente](./img/actor.png)  | **Persona** | Persona que no esta registrada en el sistema. |
|![Cliente](./img/actor.png)  | **Usuario** | Persona registrada en la plataforma que puede iniciar sesion, administrar perfiles, gestionar su suscripcion, explorar el catalogo, reproducir contenido y calificarlo. |
|![Administrador](./img/actor.png)  | **Administrador** | Usuario con permisos especiales para gestionar el contenido de la plataforma, permitiendo registrar, modificar y eliminar peliculas o series. |
|![Pasarela de Pago](./img/actor.png)  | **Pasarela de Pago** | Servicio externo que procesa las transacciones asociadas a la contratacion, modificacion o cancelacion de planes de suscripcion. |
|![Proveedor de Divisas](./img/actor.png)  | **Proveedor de Divisas** | Servicio externo que suministra los tipos de cambio utilizados por la plataforma para mostrar precios en la moneda local del usuario. |
|![Proveedor de Correo SMTP](./img/actor.png)  | **Proveedor de Correo SMTP** | Servicio externo encargado de entregar los correos de confirmacion de registro, recibos de compra y alertas de nuevo contenido. |
|![Proveedor OAuth](./img/actor.png)  | **Proveedor OAuth** | Servicio externo de identidad utilizado cuando la plataforma delega procesos de autenticacion o autorizacion mediante OAuth. |

## Casos de uso de alto nivel

## Primera descomposición

**CDU001**: **Gestión de Cuenta y Perfiles**: Agrupa las operaciones de registro, autenticacion y administracion de perfiles asociadas a una cuenta dentro de la plataforma.

**CDU002**: **Gestión de Suscripción y Pago**: Permite al usuario consultar planes, visualizar precios en moneda local y administrar su suscripcion mediante el procesamiento de pagos.

**CDU003**: **Exploración de Catálogo de Contenido**: Permite al usuario explorar el catalogo de contenido disponible en la plataforma y consultar la informacion detallada de peliculas y series.

**CDU004**: **Calificación de Contenido**: Permite al usuario emitir su valoracion sobre una pelicula o serie mediante like o dislike y consultar la recomendacion global generada por la comunidad.

**CDU005**: **Reproducción e Historial**: Permite al usuario reproducir contenido, reanudarlo desde el punto en que lo dejo y consultar el historial reciente de su perfil activo.

**CDU006**: **Administración de Contenido**: Permite al administrador gestionar el catalogo de la plataforma mediante operaciones de registro, modificacion y eliminacion de peliculas o series.

## Casos de uso expandidos

### Expandidos de CDU001: Gestión de Cuenta y Perfiles

- **CDU-001.1**: Registro de Cuenta
- **CDU-001.2**: Envio de Notificacion de Registro
- **CDU-001.3**: Inicio de Sesion
- **CDU-001.4**: Inicio de Sesion con OAuth
- **CDU-001.5**: Cierre de Sesion
- **CDU-001.6**: Actualizacion de Credenciales de Acceso
- **CDU-001.7**: Seleccion de Perfil
- **CDU-001.8**: Creacion de Perfil
- **CDU-001.9**: Modificacion de Perfil
- **CDU-001.10**: Eliminacion de Perfil

### Expandidos de CDU002: Gestión de Suscripción y Pago

- **CDU-002.1**: Visualizacion de Planes Disponibles
- **CDU-002.2**: Consulta de Tipo de Cambio de Moneda
- **CDU-002.3**: Contratacion de Suscripcion
- **CDU-002.4**: Modificacion de Plan de Suscripcion
- **CDU-002.5**: Cancelacion de Suscripcion
- **CDU-002.6**: Procesamiento de Pago
- **CDU-002.7**: Envio de Recibo de Compra

### Expandidos de CDU003: Exploración de Catálogo de Contenido

- **CDU-003.1**: Visualizacion de Catalogo de Contenido
- **CDU-003.2**: Busqueda de Catalogo de Contenido
- **CDU-003.3**: Filtrado de Catalogo de Contenido
- **CDU-003.4**: Consulta de Detalle de Contenido

### Expandidos de CDU004: Calificación de Contenido

- **CDU-004.1**: Calificacion de Contenido
- **CDU-004.2**: Consulta de Recomendacion Global del Contenido

### Expandidos de CDU005: Reproducción e Historial

- **CDU-005.1**: Reproduccion de Contenido
- **CDU-005.2**: Reanudacion de Reproduccion
- **CDU-005.3**: Consulta de Historial de Reproduccion

### Expandidos de CDU006: Administración de Contenido

- **CDU-006.1**: Registro de Contenido
- **CDU-006.2**: Envio de Alerta de Nuevo Contenido
- **CDU-006.3**: Modificacion de Contenido
- **CDU-006.4**: Eliminacion de Contenido
