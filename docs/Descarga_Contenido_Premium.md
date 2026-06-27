# Descarga de contenido — Plan Premium

## Requisito

La plataforma debe permitir la descarga simulada o el almacenamiento local de
contenido mediante almacenamiento cifrado del navegador o Service Workers.
Esta función debe estar disponible únicamente para el Plan Premium y permanecer
bloqueada para los planes Básico y Estándar.

## Solución implementada

Quetzal TV utiliza la opción de **almacenamiento cifrado del navegador**. No se
utilizan Service Workers.

La descarga es simulada: se conserva localmente la información necesaria para
identificar la película o el episodio, pero no se descarga el archivo completo
del video. Al abrir una descarga, la aplicación vuelve al contenido en línea y
solicita una URL de reproducción vigente.

### Tecnologías utilizadas

- **IndexedDB:** almacena las descargas en el navegador.
- **Web Crypto API:** realiza las operaciones criptográficas.
- **AES-GCM de 256 bits:** cifra y autentica cada registro.
- **Clave no extraíble:** el navegador puede utilizarla para cifrar y descifrar,
  pero JavaScript no puede exportarla.

Cada descarga utiliza un vector de inicialización aleatorio y se identifica por
cuenta, perfil, contenido y episodio. Esto evita mezclar las descargas de
perfiles diferentes.

## Restricción por plan

El backend consulta la suscripción activa y devuelve el atributo
`puede_descargar`.

- **Premium activo:** `puede_descargar: true`.
- **Básico, Estándar, suscripción cancelada o sin suscripción:**
  `puede_descargar: false`.

El frontend utiliza este permiso para habilitar o bloquear la descarga. No se
deduce el plan a partir del número de perfiles.

Si el usuario cambia de Premium a otro plan, los registros locales permanecen
cifrados, pero la pantalla no permite consultarlos ni abrirlos hasta recuperar
un Plan Premium activo.

## Gestión de descargas

La ruta privada `/downloads` permite al perfil activo:

- Consultar sus descargas simuladas.
- Abrir la película o el episodio en línea.
- Eliminar registros del almacenamiento local.

Las URLs firmadas o temporales de reproducción no se guardan en IndexedDB.

## Verificación en Chrome o Edge

1. Iniciar sesión con una cuenta que tenga Plan Premium.
2. Seleccionar un perfil.
3. Abrir una película o un episodio y presionar el botón de descarga.
4. Abrir las herramientas de desarrollador.
5. Ir a **Application → Storage → IndexedDB → `quetzal_offline_content`**.
6. Revisar los almacenes:
   - `downloads`: contiene los registros cifrados.
   - `keys`: contiene la clave criptográfica no extraíble.

Las descargas no aparecen en **Local Storage**, porque ese mecanismo fue
reemplazado por IndexedDB cifrado. Si los datos no aparecen inmediatamente en
DevTools, se debe actualizar la vista de IndexedDB.

## Cumplimiento

La implementación satisface el requisito mediante **descarga simulada con
almacenamiento cifrado del navegador** y aplica la restricción normativa para
que solamente el Plan Premium tenga acceso a la función.
