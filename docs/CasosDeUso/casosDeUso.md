# Casos de Uso

## Core del negocio
| Representación | Actor | Descripción |
|----|-------------|-------------|
|![Cliente](./img/actor.png)  | **Cliente** | Persona que utiliza la plataforma para registrarse, iniciar sesion, administrar perfiles, gestionar su suscripcion, explorar el catalogo, reproducir contenido y calificarlo. |
|![Administrador](./img/actor.png)  | **Administrador** | Usuario con permisos especiales para gestionar el contenido de la plataforma, permitiendo registrar y eliminar peliculas o series. |
|![Pasarela de Pago](./img/actor.png)  | **Pasarela de Pago** | Servicio externo que procesa las transacciones asociadas a la asignación de planes de suscripcion. |
|![Proveedor de Divisas](./img/actor.png)  | **Proveedor de Divisas** | Servicio externo que suministra los tipos de cambio utilizados por la plataforma para mostrar precios en la moneda local del usuario. |
|![Proveedor de Correo SMTP](./img/actor.png)  | **Proveedor de Correo SMTP** | Servicio externo encargado de entregar los correos de confirmacion de registro, recibos de compra y alertas de nuevo contenido. |
|![Proveedor OAuth](./img/actor.png)  | **Proveedor OAuth** | Servicio externo de identidad utilizado cuando la plataforma delega procesos de autenticacion o autorizacion mediante OAuth. |

## Casos de uso de alto nivel

## Primera descomposición

**CDU001**: **Gestión de Cuenta y Perfiles**: Reúne las operaciones que el cliente realiza para registrarse, autenticarse y administrar los perfiles asociados a su cuenta.

**CDU002**: **Gestión de Suscripción y Pago**: Permite al cliente consultar planes, ver precios en moneda local y administrar su suscripción mediante el procesamiento de pagos.

**CDU003**: **Exploración de Catálogo**: Permite al cliente descubrir el contenido disponible en la plataforma y consultar la información detallada de películas y series.

**CDU004**: **Calificación de Contenido**: Permite al cliente emitir su valoracion sobre una pelicula o serie mediante like o dislike y consultar la recomendacion global generada por la comunidad.

**CDU005**: **Reproducción e Historial**: Permite al cliente reproducir contenido, continuar desde el punto en que lo dejó y consultar el historial reciente de su perfil activo.

**CDU006**: **Notificaciones por Correo**: Agrupa las notificaciones automáticas que el sistema envía al cliente como parte de los procesos principales de registro, compra y publicación de contenido.

**CDU007**: **Gestión de Divisas**: Administra la consulta de tipos de cambio y la conversión de precios en coordinación con el proveedor externo de divisas.

**CDU008**: **Administración de Contenido**: Permite al administrador gestionar el catálogo de la plataforma mediante operaciones de alta, actualización y baja de películas o series.

## Casos de uso expandidos

### Expandidos de CDU001: Gestión de Cuenta y Perfiles

- **CDU-001.1**: Registrar Cuenta
- **CDU-001.2**: Iniciar Sesión
- **CDU-001.3**: Iniciar Sesión con OAuth
- **CDU-001.4**: Cerrar Sesión
- **CDU-001.5**: Actualizar Credenciales de Acceso
- **CDU-001.6**: Seleccionar Perfil
- **CDU-001.7**: Crear Perfil
- **CDU-001.8**: Modificar Perfil
- **CDU-001.9**: Eliminar Perfil

### Expandidos de CDU002: Gestión de Suscripción y Pago

- **CDU-002.1**: Ver Planes Disponibles
- **CDU-002.2**: Consultar Precio en Moneda Local
- **CDU-002.3**: Contratar Suscripción
- **CDU-002.4**: Modificar Plan de Suscripción
- **CDU-002.5**: Cancelar Suscripción
- **CDU-002.6**: Procesar Pago
- **CDU-002.7**: Generar Recibo de Compra

### Expandidos de CDU003: Exploración de Catálogo

- **CDU-003.1**: Visualizar Catálogo
- **CDU-003.2**: Buscar Contenido
- **CDU-003.3**: Filtrar Catálogo
- **CDU-003.4**: Ver Detalle de Contenido

### Expandidos de CDU004: Calificación de Contenido

- **CDU-004.1**: Calificar Contenido
- **CDU-004.2**: Consultar Recomendacion Global del Contenido

### Expandidos de CDU005: Reproducción e Historial

- **CDU-005.1**: Reproducir Contenido
- **CDU-005.2**: Reanudar Reproducción
- **CDU-005.3**: Registrar Progreso de Visualización
- **CDU-005.4**: Consultar Historial de Reproducción

### Expandidos de CDU006: Notificaciones por Correo

- **CDU-006.1**: Enviar Confirmación de Registro
- **CDU-006.2**: Enviar Recibo de Compra
- **CDU-006.3**: Enviar Alerta de Nuevo Contenido

### Expandidos de CDU007: Gestión de Divisas

- **CDU-007.1**: Consultar Tipo de Cambio
- **CDU-007.2**: Convertir Precio a Moneda Local
- **CDU-007.3**: Actualizar Caché de Tipos de Cambio

### Expandidos de CDU008: Administración de Contenido

- **CDU-008.1**: Registrar Contenido
- **CDU-008.3**: Eliminar Contenido
