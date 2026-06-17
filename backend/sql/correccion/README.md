# Correccion de SQL

En esta carpeta se dejaron versiones corregidas de los scripts originales:

- [01_usuarios_corregido.sql](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/sql/correccion/01_usuarios_corregido.sql)
- [02_catalogo_corregido.sql](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/sql/correccion/02_catalogo_corregido.sql)

La idea fue **no tocar tus archivos originales** y dejar aparte versiones mas seguras o mas alineadas con la implementacion real.

## Correcciones realizadas

### 1. Se creo explicitamente el esquema `usuarios`

En tu script original se usaban referencias como:

- `usuarios.perfiles`
- `usuarios.instantaneas`

pero nunca se creaba el esquema `usuarios`.

Correccion aplicada:

- se agrego `CREATE SCHEMA IF NOT EXISTS usuarios;`
- tambien se agrego `SET search_path TO usuarios, public;`

## 2. Se corrigio el orden de creacion de tablas

En el script original, la tabla `sesiones` se creaba antes que `perfiles`, pero tenia esta llave foranea:

- `perfil_id UUID REFERENCES perfiles(id)`

Eso provoca error porque `perfiles` todavia no existe en ese momento.

Correccion aplicada:

- primero se crea `cuentas`
- luego `perfiles`
- despues `sesiones`

## 3. Se unifico el uso del esquema en todos los objetos

En el script original algunas sentencias usaban el esquema `usuarios` y otras no.

Ejemplos:

- `CREATE TABLE cuentas ...`
- `ON usuarios.perfiles(cuenta_id)`
- `INSERT INTO usuarios.instantaneas ...`

Eso puede causar inconsistencias dependiendo del `search_path` de PostgreSQL.

Correccion aplicada:

- tablas, vistas, indices, funciones y triggers quedaron referenciados como `usuarios.<objeto>`

## 4. Se ajustaron funciones y triggers para usar nombres completos

Las funciones de auditoria insertaban en `usuarios.instantaneas`, pero los triggers estaban definidos sobre tablas sin esquema.

Correccion aplicada:

- los triggers quedaron definidos sobre `usuarios.cuentas` y `usuarios.perfiles`
- las funciones quedaron creadas como `usuarios.fn_actualizar_actualizado_en()` y `usuarios.fn_registrar_instantanea()`

## 5. Se movieron los indices a una seccion mas clara

No era un error critico, pero quedaba mas ordenado declarar los indices despues de crear todas las tablas.

Correccion aplicada:

- los indices se agruparon en una seccion separada

## 6. Se agrego una validacion para el color del perfil

Tu tabla `perfiles` usa un color tipo `#6D28D9`. Eso sugiere un formato hexadecimal.

Correccion aplicada:

- se agrego `CHECK (color ~ '^#[0-9A-Fa-f]{6}$')`

Esto no era obligatorio, pero ayuda a proteger la integridad del dato.

## Resumen corto

Los dos problemas mas importantes del script original eran:

1. se referenciaba el esquema `usuarios` sin crearlo
2. `sesiones` dependia de `perfiles` antes de que `perfiles` existiera

Con la version corregida, el script ya queda mucho mas consistente para ejecutarse en PostgreSQL.

---

# Correccion del SQL de Catalogo

En `catalogo` la correccion no fue solo cosmetica. Se hizo para soportar mejor la idea de:

- guardar un `trailer` de YouTube en `catalogo`
- mantener `streaming` desacoplado del trailer

## Correcciones realizadas

### 1. Se renombro `url_video` a `url_trailer`

En tu script original la tabla `contenidos` solo tenia:

- `url_video`

Pero en el enfoque real que ustedes quieren, ese campo se usara solo para el trailer.

Correccion aplicada:

- `url_video` se reemplazo por `url_trailer`

Con eso `catalogo` guarda claramente el enlace del trailer sin sugerir que ahi mismo vive el contenido principal.

## 2. Se actualizaron las vistas para reflejar la separacion

Las vistas `v_cartelera_contenido` y `v_detalle_contenido` quedaron ajustadas para exponer:

- `url_trailer`

Esto ayuda a que frontend pueda mostrar el trailer sin confundirlo con otro tipo de recurso.

## 3. Se agrego el procedimiento de registro completo alineado al nuevo modelo

En la version corregida se incluyo `sp_registrar_contenido_completo(...)` para insertar:

- datos base del contenido
- `url_trailer`
- `creado_por_cuenta_id`
- generos asociados

Asi queda consistente con el microservicio real de `catalogo`.

## 4. Se dejo tambien `sp_calificar_contenido(...)`

Ese procedimiento se agrego en la version corregida para que el comportamiento de calificaciones quede alineado con lo que ya usa el servicio.

## Resumen corto de Catalogo

El cambio principal fue dejar claro que `catalogo` solo guarda el `trailer`. Si mas adelante quieren un video principal o reproduccion propia, eso se puede modelar aparte sin ensuciar este script.

## Recomendacion

Si quieres usar estas versiones como base final, el siguiente paso recomendable seria:

1. probarla directamente en PostgreSQL
2. reflejar la misma estructura en el microservicio correspondiente
3. convertirla despues en migraciones versionadas
