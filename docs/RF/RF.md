# Requerimientos Funcionales — Quetzal TV

| ID | Prioridad | Módulo | Requerimiento | Descripción |
|----|-----------|--------|---------------|-------------|
| RF-01 | Alta | Autenticación | Registro de usuario | El sistema debe permitir a un nuevo usuario registrarse proporcionando nombre, correo electrónico y contraseña. |
| RF-02 | Alta | Autenticación | Inicio de sesión | El sistema debe autenticar al usuario mediante correo electrónico y contraseña, generando una sesión válida mediante JWT. |
| RF-03 | Media | Autenticación | Cierre de sesión | El sistema debe permitir al usuario cerrar su sesión activa, invalidando el token. |
| RF-04 | Alta | Multiperfil | Gestión de perfiles | El sistema debe permitir a un usuario crear, editar y eliminar perfiles dentro de su cuenta, con un máximo de 5 perfiles por cuenta. Cada perfil tendrá nombre e imagen opcional. |
| RF-05 | Alta | Multiperfil | Selección de perfil | Al iniciar sesión, el sistema debe presentar al usuario la lista de perfiles disponibles en su cuenta para que seleccione con cuál desea navegar. |
| RF-06 | Media | Autenticación | Actualización de credenciales | El sistema debe permitir al usuario actualizar su contraseña y correo electrónico desde el panel de administración de su cuenta. |
| RF-07 | Alta | Suscripciones | Visualización de planes | El sistema debe mostrar los planes de suscripción disponibles con sus características y precio en la moneda local del usuario. |
| RF-08 | Alta | Suscripciones | Contratación de plan | El sistema debe permitir al usuario seleccionar y contratar un plan de suscripción, procesando el pago y emitiendo un recibo por correo electrónico. |
| RF-09 | Media | Suscripciones | Modificación de plan | El sistema debe permitir al usuario cambiar su plan de suscripción activo por uno diferente desde el panel de administración de su cuenta. |
| RF-10 | Media | Suscripciones | Cancelación de suscripción | El sistema debe permitir al usuario cancelar su suscripción activa desde el panel de administración de su cuenta. |
| RF-11 | Alta | Catálogo | Exploración del catálogo | El sistema debe presentar al usuario un catálogo de películas y series disponibles, mostrando para cada contenido su título, imagen de portada y porcentaje global de recomendación. |
| RF-12 | Alta | Catálogo | Búsqueda de contenido | El sistema debe permitir al usuario buscar contenido por título mediante una barra de búsqueda con resultados en tiempo real. |
| RF-13 | Alta | Catálogo | Filtrado por categoría y género | El sistema debe permitir al usuario filtrar el catálogo por categorías y géneros de forma combinada. |
| RF-14 | Alta | Catálogo | Vista detallada de contenido | El sistema debe presentar la ficha técnica completa de una película o serie: sinopsis, año, duración, géneros y reparto. |
| RF-15 | Media | Calificaciones | Calificación de contenido | El sistema debe permitir al usuario calificar un contenido mediante estrellas o un sistema de pulgar arriba/abajo. Cada perfil puede emitir una única calificación por contenido, editable posteriormente. |
| RF-16 | Alta | Calificaciones | Porcentaje global de recomendación | El sistema debe calcular y mostrar dinámicamente el porcentaje global de recomendación de cada contenido a partir del total de calificaciones de la comunidad. |
| RF-17 | Alta | FX-Service | Precios en moneda local | El sistema debe mostrar el costo de los planes de suscripción en la moneda local del usuario, obteniendo el tipo de cambio vigente desde el FX-Service. |
| RF-18 | Alta | FX-Service | Caché de tipos de cambio | El FX-Service debe almacenar los tipos de cambio consultados en Redis con una política TTL definida, evitando consultas repetitivas a la API externa de divisas. |
| RF-19 | Alta | Historial | Registro de progreso de reproducción | El sistema debe registrar automáticamente el progreso de visualización de cada contenido por perfil: porcentaje visto para películas y temporada, capítulo y minuto exacto para series. |
| RF-20 | Alta | Historial | Reanudación de contenido | El sistema debe permitir al usuario reanudar la reproducción de un contenido desde el punto exacto donde lo dejó, basándose en el historial registrado para su perfil activo. |
| RF-21 | Alta | Notificaciones | Correo de confirmación de registro | El sistema debe enviar automáticamente un correo electrónico de bienvenida al usuario al completar el proceso de registro. |
| RF-22 | Alta | Notificaciones | Correo de recibo de compra | El sistema debe enviar automáticamente un correo electrónico con el detalle del recibo al usuario al confirmar la contratación o modificación de un plan de suscripción. |
| RF-23 | Media | Notificaciones | Alerta de nuevas publicaciones | El sistema debe enviar notificaciones por correo electrónico a los usuarios suscritos cuando se publique nuevo contenido en la plataforma. |
| RF-24 | Media | Catalogo | Administración de contenido | El sistema debe permitir a los administradores agregar, editar y eliminar películas y series en el catálogo, gestionando su ficha técnica completa. |
| RF-25 | Media | Catalogo | Programación de publicaciones | El sistema debe permitir a los administradores programar la fecha de publicación de nuevos contenidos en el catálogo. |
| RF-26 | Media | Auditoría | Visualización de triggers | El sistema debe registrar en un log centralizado los eventos críticos de la base de datos y mostrarlos al administrador además de permitir descagarlos en csv y pdf. |
| RF-27 | Alta | Recomendaciones | Sistema de recomendación | El sistema debe recomendar contenido a los usuarios basándose en su historial de visualización y calificaciones. |
| RF-28 | Alta | Perfiles | Control Parental | El sistema debe permitir habilitar/deshabilitar la restricción de edad, lo que limitará el acceso a contenido inapropiado de los perfiles infantiles a menos que introduzca el pin correcto |
| RF-29 | Alta | Salas | Gestión de salas | El sistema debe permitir a los usuarios premium iniciar la reproducción del contenido con cualquier otro tipo de usuario en la misma sala en tiempo real. |
| RF-30 | Media | Descargas | Gestión de descargas | El sistema debe permitir a los usuarios estándar descargar contenido. |
| RF-31 | Media | Auditoría | Automatización de auditoría y purgación | El sistema debe ejecutar un cronjob programado para auditar la base de datos, identificar cuentas inactivas y purgarlas de forma segura, registrando cada acción en el log centralizado. |

[Volver a Documentación](../Documentación.md)
