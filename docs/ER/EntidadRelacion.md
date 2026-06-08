# Modelo Entidad-Relacion — Quetzal TV

Modelo de datos relacional disenado bajo el patron **Database per Microservice**. Cada microservicio posee su propia base de datos PostgreSQL independiente.

---

## Principios

| Principio | Descripcion |
|-----------|-------------|
| **Una base de datos por microservicio** | Cada dominio opera sobre su propia instancia PostgreSQL. |
| **Eliminacion logica** | Entidades principales usan `eliminado_en` en lugar de borrado permanente. |
| **Auditoria declarativa** | Tabla `instantaneas` por base de datos registra cambios via triggers en JSONB. |
| **Referencias logicas** | Campos `UUID` entre bases representan relaciones de negocio, no FK fisicas. |
| **Videos externos** | El modelo no almacena archivos multimedia; solo conserva URLs externas. |

---

## Base de datos `usuarios`

Gestiona identidad, acceso y perfiles.

### `cuentas`
Registro principal de identidad. Almacena nombre, correo unico, hash de contrasena, pais y rol. Incluye eliminacion logica.

### `perfiles`
Perfiles internos asociados a una cuenta. Cada perfil mantiene historial y preferencias aislados. Solo puede existir un perfil principal por cuenta.

### `sesiones`
Sesiones activas o historicas. Registra metodo de autenticacion, perfil seleccionado, expiracion y cierre.

### `instantaneas`
Auditoria declarativa. Registra inserciones, actualizaciones y eliminaciones en formato JSONB.

---

## Base de datos `catalogo`

Administra contenido multimedia, metadatos, reparto, generos y calificaciones.

### `contenidos`
Tabla principal de peliculas y series. Almacena titulo, tipo, sinopsis, ficha tecnica, duracion, idioma, portada y enlace de video.

### `temporadas`
Temporadas asociadas a una serie. Permite agrupar episodios y mantener metadatos por temporada.

### `episodios`
Capitulos pertenecientes a una temporada. Almacena titulo, sinopsis, duracion y enlace de video.

### `generos`
Catalogo de generos disponibles para clasificar contenido.

### `reparto`
Actores y participantes del contenido.

### `contenido_generos`
Relacion muchos a muchos entre contenido y generos.

### `contenido_reparto`
Relacion muchos a muchos entre contenido y reparto. Permite registrar el personaje interpretado.

### `calificaciones`
Reacciones de la comunidad por perfil y contenido. Un perfil solo puede calificar una vez el mismo contenido.

### `instantaneas`
Auditoria declarativa del dominio de catalogo.

---

## Base de datos `streaming`

Registra progreso de reproduccion e historial reciente por perfil. No almacena archivos de video.

### `historial_reproduccion`
Avance de visualizacion asociado a un perfil. Para peliculas guarda progreso en segundos; para series guarda episodio y minuto exacto.

### `instantaneas`
Auditoria declarativa del dominio de streaming.

---

## Base de datos `suscripciones`

Gestiona planes disponibles, contrataciones, cambios de plan y estados de vigencia.

### `planes`
Catalogo de planes de suscripcion. Define nombre, descripcion, precio base, moneda, cantidad maxima de perfiles y vigencia.

### `suscripciones`
Relacion contractual entre una cuenta y un plan. Registra estado (`activa`, `cancelada`, `vencida`) y periodo de vigencia.

### `cambios_plan`
Historial de migraciones entre planes de una suscripcion.

### `instantaneas`
Auditoria declarativa del dominio de suscripciones.

---

## Base de datos `cobros`

Procesa pagos, registra transacciones y genera recibos.

### `transacciones`
Registro financiero de una operacion de pago. Almacena cuenta, plan, tipo de operacion, montos en moneda base y local, estado del pago y referencia de pasarela externa.

### `recibos`
Comprobante generado tras una transaccion aprobada. Incluye numero unico, correo destino y estado de envio.

### `instantaneas`
Auditoria declarativa del dominio de cobros.

---

## Base de datos `notificaciones`

Centraliza el envio de correos electronicos y registra el resultado de cada intento.

### `envios_correo`
Registro operativo de cada intento de envio. Almacena tipo de notificacion, destinatario, asunto, estado (`enviado` o `fallido`), error si aplica, servicio origen y referencia del evento disparador.

---


## Archivos Individuales

-  `01_usuarios.sql`, `02_catalogo.sql`, `03_streaming.sql`, `04_suscripciones.sql`, `05_cobros.sql`, `06_notificaciones.sql`
