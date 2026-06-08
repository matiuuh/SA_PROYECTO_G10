# Correccion del SQL de Usuarios

En esta carpeta se dejo una version corregida del script de usuarios:

- [01_usuarios_corregido.sql](/c:/Users/yahir/OneDrive/Desktop/SA%20PROYECTO/SA_PROYECTO_G10/backend/correccion/01_usuarios_corregido.sql)

La idea fue **no tocar tu archivo original** y dejar aparte una version que ya sea mas segura para ejecutar en PostgreSQL.

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

## Recomendacion

Si quieres usar esta version como base final, el siguiente paso recomendable seria:

1. probarla directamente en PostgreSQL
2. moverla luego a `backend/services/usuario/database/sql/`
3. convertirla despues en migraciones versionadas
