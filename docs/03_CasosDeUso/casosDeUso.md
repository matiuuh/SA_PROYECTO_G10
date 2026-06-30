# Casos de Uso

## Core del negocio
| Representación | Actor | Descripción |
|----|-------------|-------------|
|![Cliente](./img/actor.png)  | **Usuario** | Persona registrada en la plataforma que puede iniciar sesión, administrar perfiles y su control parental, gestionar su suscripción, explorar el catálogo y sus recomendaciones, reproducir o descargar contenido y participar en Watch Parties. |
|![Administrador](./img/actor.png)  | **Administrador** | Usuario con permisos especiales para gestionar el contenido de la plataforma, permitiendo registrar, modificar, eliminar películas o series y consultar la auditoría del catálogo. |
|![Proveedor de Divisas](./img/actor.png)  | **Proveedor de Divisas** | Servicio externo que suministra los tipos de cambio utilizados por la plataforma para mostrar precios en la moneda local del usuario. |
|![Proveedor de Correo SMTP](./img/actor.png)  | **Proveedor de Correo SMTP** | Servicio externo encargado de entregar los correos de confirmación de registro, recibos de compra y alertas de nuevo contenido. |


## Casos de uso de alto nivel

![Diagrama de Casos de Uso del Sistema](./img/CDU_SISTEMA.png)

## Primera descomposición

![Primera Descomposicion](./img/CDU_PRIMERADESCOMPOSICION.png)

**CDU001**: **Gestión de Cuenta y Perfiles**: Agrupa las operaciones de registro, autenticación, administración de perfiles y configuración de control parental asociadas a una cuenta dentro de la plataforma.

**CDU002**: **Gestión de Suscripción y Pago**: Permite al usuario consultar planes, visualizar precios en moneda local y administrar su suscripción mediante el procesamiento de pagos.

**CDU003**: **Exploración de Catálogo de Contenido**: Permite al usuario explorar el catálogo, consultar la información detallada de películas y series y recibir recomendaciones personalizadas para su perfil.

**CDU004**: **Calificación de Contenido**: Permite al usuario emitir su valoración sobre una película o serie mediante like o dislike y consultar la recomendación global generada por la comunidad.

**CDU005**: **Reproducción e Historial**: Permite al usuario reproducir contenido, reanudarlo, consultar el historial del perfil activo, crear o ingresar a Watch Parties y guardar descargas simuladas cuando su plan lo permite.

**CDU006**: **Administración de Contenido**: Permite al administrador gestionar el catálogo de la plataforma mediante operaciones de registro, modificación y eliminación de películas o series.

**CDU007**: **Consulta de Auditoría del Catálogo**: Permite al administrador consultar los eventos críticos registrados por triggers sobre el catálogo, revisar cambios realizados y exportar la información para trazabilidad.

## Casos de uso expandidos

### Expandidos de CDU001: Gestión de Cuenta y Perfiles

![CDU001](./img/CDU_CDU001.png)

- **CDU-001.1**: Registro de Cuenta
- **CDU-001.2**: Envío de Notificación de Registro
- **CDU-001.3**: Inicio de sesión
- **CDU-001.5**: Cierre de sesión
- **CDU-001.6**: Actualización de Credenciales de Acceso
- **CDU-001.7**: Selección de Perfil
- **CDU-001.8**: Creación de Perfil
- **CDU-001.9**: Modificación de Perfil
- **CDU-001.10**: Eliminación de Perfil
- **CDU-001.11**: Configuración de Control Parental

#### CDU-001.1 Registro de Cuenta

| Campo | Especificación |
|----|----|
| Nombre | Registro de Cuenta |
| Código | CDU-001.1 |
| Actores | Usuario |
| Descripción | Permite a un usuario crear una cuenta en la plataforma ingresando sus datos básicos y su ubicación para habilitar el acceso al sistema y la creación automática de su primer perfil. |
| Precondiciones | El usuario no debe tener una cuenta registrada con el mismo correo electrónico. |
| Postcondiciones | Cuenta registrada correctamente y perfil principal creado con el nombre de la cuenta. |
| Flujo principal | 1. El usuario ingresa nombre, correo, contraseña, confirmando su contraseña y ubicación.<br>2. El usuario confirma el registro.<br>3. El sistema valida la información.<br>4. El sistema crea la cuenta.<br>5. El sistema crea automáticamente el perfil principal usando el nombre de la cuenta.<br>6. El sistema confirma el registro exitoso. |
| Flujos alternos | FA1. El correo ya existe.<br>FA1.1 El sistema informa que la cuenta ya está registrada.<br>FA2. Faltan datos obligatorios.<br>FA2.1 El sistema resalta los campos requeridos. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible completar el registro. Intenta nuevamente.<br>FE2. El servicio de notificaciones no responde (timeout SMTP).<br>FE2.1 El sistema registra el fallo de envío de correo de bienvenida, pero confirma el registro exitoso. |
| Reglas de negocio | El correo debe ser único en la plataforma.<br>La ubicación debe registrarse como parte de la cuenta.<br>La cuenta debe crear un perfil principal automáticamente.<br>El nombre del primer perfil debe corresponder al nombre de la cuenta registrada. |
| Reglas de calidad | El formulario debe validar campos obligatorios antes del envío.<br>La confirmación del registro debe mostrarse en un tiempo razonable. |

#### CDU-001.2 Envío de Notificación de Registro

| Campo | Especificación |
|----|----|
| Nombre | Envío de Notificación de Registro |
| Código | CDU-001.2 |
| Actores | Usuario, Proveedor de Correo SMTP |
| Descripción | Permite al sistema enviar un correo de confirmación al usuario luego de completar el registro de cuenta de forma satisfactoria. |
| Precondiciones | La cuenta debe haberse registrado correctamente y el correo electrónico debe estar disponible. |
| Postcondiciones | Correo de bienvenida enviado; o fallo de envío registrado por el sistema. |
| Flujo principal | 1. El sistema detecta que el registro fue exitoso.<br>2. El sistema construye el mensaje de bienvenida.<br>3. El sistema realiza el envío al usuario.<br> |
| Flujos alternos | FA1. El proveedor SMTP no responde o rechaza la solicitud.<br>FA1.1 El servicio SMPT registra el fallo de envío.<br>FA2. El correo de destino es inválido. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema registra el fallo de envío sin reintentar.<br>FE2. Timeout del proveedor SMTP.<br>FE2.1 El sistema marca la notificación como fallida y continúa. |
| Reglas de negocio | El correo de bienvenida solo se envía después de un registro exitoso.<br>El mensaje debe estar asociado a la cuenta recién creada. |
| Reglas de calidad | El envío no debe bloquear la confirmación visual del registro. |

#### CDU-001.3 Inicio de sesión

| Campo | Especificación |
|----|----|
| Nombre | Inicio de sesión |
| Código | CDU-001.3 |
| Actores | Usuario, Administrador |
| Descripción | Permite a un usuario o administrador autenticarse en la plataforma mediante sus credenciales registradas para acceder a las funciones disponibles de su cuenta. |
| Precondiciones | El usuario o administrador debe tener una cuenta registrada y activa. |
| Postcondiciones | Sesión iniciada correctamente; o acceso denegado por credenciales inválidas. |
| Flujo principal | 1. El usuario o administrador ingresa su correo y contraseña.<br>2. El usuario o administrador confirma el inicio de sesión.<br>3. El sistema valida las credenciales.<br>4. El sistema crea la sesión segura de la cuenta.<br>5. El sistema muestra acceso a la cuenta. |
| Flujos alternos | FA1. Credenciales incorrectas.<br>FA1.1 El sistema informa que las credenciales son inválidas.|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible validar las credenciales. Intenta nuevamente.<br>FE2. Token inválido o sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Solo cuentas registradas pueden iniciar sesión con correo y contraseña.<br>La sesión debe quedar asociada a una cuenta válida. |
| Reglas de calidad | Las credenciales no deben mostrarse en texto plano.<br>El sistema debe informar errores sin exponer detalles sensibles. |

#### CDU-001.5 Cierre de sesión

| Campo | Especificación |
|----|----|
| Nombre | Cierre de sesión |
| Código | CDU-001.5 |
| Actores | Usuario, Administrador |
| Descripción | Permite al usuario o administrador cerrar su sesión activa para finalizar de forma segura el acceso a la plataforma desde el dispositivo actual. |
| Precondiciones | El usuario o administrador debe tener una sesión activa. |
| Postcondiciones | Sesión cerrada correctamente e invalidada en el cliente; o la solicitud no se procesa por ausencia de sesión válida. |
| Flujo principal | 1. El usuario o administrador selecciona cerrar sesión.<br>2. El sistema verifica la sesión activa.<br>3. El sistema invalida el token de sesión.<br>4. El sistema redirige a la pantalla pública de acceso. |
| Flujos alternos |<br>FA1.1 El sistema fuerza la salida y redirige a la pantalla de acceso. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema invalida el token localmente y redirige a la pantalla de acceso.<br>FE2. Token inválido o ya expirado.<br>FE2.1 El sistema redirige a la pantalla de acceso. |
| Reglas de negocio | El cierre de sesión debe invalidar el token activo del usuario.<br>La salida debe aplicarse sobre la sesión actual. |
| Reglas de calidad | El cierre de sesión debe ser inmediato y visible para el usuario.<br>El token no debe permanecer activo en el cliente. |

#### CDU-001.6 Actualización de Credenciales de Acceso

| Campo | Especificación |
|----|----|
| Nombre | Actualización de Credenciales de Acceso |
| Código | CDU-001.6 |
| Actores | Usuario |
| Descripción | Permite al usuario actualizar la contraseña asociada a su cuenta desde la configuración para mantener segura su información de acceso. |
| Precondiciones | El usuario debe haber iniciado sesión. |
| Postcondiciones | Contraseña actualizada correctamente; o actualización rechazada por datos inválidos. |
| Flujo principal | 1. El usuario accede a la configuración de cuenta.<br>2. El usuario ingresa la contraseña actual.<br> 3. El usuario ingresa la nueva contraseña y la reescribe para confirmar.<br>4. El sistema valida la información proporcionada.<br>5. El sistema actualiza la contraseña asociada a la cuenta.<br>6. El sistema confirma la actualización. |
| Flujos alternos | FA1. La nueva contraseña no cumple la validacion de tener la misma.<br>FA1.1 El sistema rechaza la actualización de la contraseña.<br>|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible actualizar la contraseña. Intenta nuevamente.<br>FE2. Sesión expirada durante el proceso.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | La contraseña debe cumplir la política de seguridad definida por la plataforma.<br>La nueva contraseña debe ser diferente de la contraseña actual. |
| Reglas de calidad | La actualización debe requerir validaciones claras para el usuario.<br>La información sensible no debe exponerse en pantalla ni en registros. |

#### CDU-001.7 Selección de Perfil

| Campo | Especificación |
|----|----|
| Nombre | Selección de Perfil |
| Código | CDU-001.7 |
| Actores | Usuario |
| Descripción | Permite al usuario elegir uno de los perfiles asociados a su cuenta para navegar con preferencias, historial y valoraciónes aisladas. |
| Precondiciones | El usuario debe haber iniciado sesión y contar con al menos un perfil asociado a su cuenta con su plan de pago. |
| Postcondiciones | Perfil activo seleccionado correctamente. |
| Flujo principal | 1. El sistema muestra los perfiles asociados a la cuenta.<br>2. El usuario selecciona un perfil disponible.<br>3. El sistema activa el perfil elegido.<br>4. El sistema habilita la navegación con el contexto del perfil activo. |
| Flujos alternos | <br>FA1. El perfil seleccionado ya no se encuentra disponible.<br>FA2.1 El sistema identifica que ya no existe y en la siguiente interacción selecciona automaticamente otro perfil. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible cargar los perfiles. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Toda cuenta debe contar con al menos un perfil creado automáticamente al momento del registro.<br>Un usuario solo puede seleccionar perfiles de su propia cuenta.<br>Cada perfil debe mantener su información aislada. |
| Reglas de calidad | La selección debe mostrar claramente cuál perfil quedo activo.<br>El cambio de perfil no debe mezclar historiales ni preferencias. |

#### CDU-001.8 Creación de Perfil

| Campo | Especificación |
|----|----|
| Nombre | Creación de Perfil |
| Código | CDU-001.8 |
| Actores | Usuario |
| Descripción | Permite al usuario crear perfiles adicionales dentro de su cuenta para separar preferencias, historial de reproducción y calificaciónes. |
| Precondiciones | El usuario debe haber iniciado sesión, haber adquirido un plan y no haber alcanzado el limite de perfiles permitidos. |
| Postcondiciones | Perfil creado correctamente; o creación rechazada por datos inválidos. |
| Flujo principal | 1. El usuario accede a la gestión de perfiles.<br>2. El usuario ingresa nombre y color del perfil.<br>3. El sistema valida la información ingresada.<br>4. El sistema crea el nuevo perfil.<br> 5. El usuario puede seleccionar el perfil como el principal o no seleccionarlo.<br>5. El sistema muestra la creación del perfil. |
| Flujos alternos | FA1. Inhabilita la posibilidad de agregar mas perfiles.<br>FA2. Falta el nombre del perfil.<br>FA2.1 El sistema solicita completar el dato obligatorio. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible crear el perfil. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Una cuenta puede tener como máximo cinco perfiles, pero depende del plan escogido.<br>Cada perfil debe pertenecer a una única cuenta. |
| Reglas de calidad | La creación debe completarse con validaciones simples y claras.<br>La respuesta del sistema debe indicar el resultado de la operación. |

#### CDU-001.9 Modificación de Perfil

| Campo | Especificación |
|----|----|
| Nombre | Modificación de Perfil |
| Código | CDU-001.9 |
| Actores | Usuario |
| Descripción | Permite al usuario modificar la información visible de uno de sus perfiles para actualizar su identificación dentro de la cuenta. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un plan de pago y el perfil a modificar debe pertenecer a su cuenta. |
| Postcondiciones | Perfil actualizado correctamente; o modificación rechazada por datos inválidos o perfil no autorizado. |
| Flujo principal | 1. El usuario ingresa al panel de perfiles y selecciona la opción de administrar perfiles.<br>2. El usuario selecciona un perfil a editar.<br>3. El usuario modifica nombre o color del perfil.<br>4. El sistema valida la información.<br>5. El sistema guarda los cambios.<br>6. El sistema muestra la actualización del perfil. |
| Flujos alternos | FA1. El usuario puede cambiar el perfil principal a otro.  |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible modificar el perfil. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Solo pueden modificarse perfiles pertenecientes a la cuenta autenticada.<br>La modificación no debe afectar el historial ni las calificaciónes existentes. |
| Reglas de calidad | La actualización debe reflejarse inmediatamente en la interfaz.<br>Los cambios deben conservar la integridad de la información del perfil. |

#### CDU-001.10 Eliminación de Perfil

| Campo | Especificación |
|----|----|
| Nombre | Eliminación de Perfil |
| Código | CDU-001.10 |
| Actores | Usuario |
| Descripción | Permite al usuario eliminar perfiles adicionales de su cuenta cuando ya no desea conservar su historial y preferencias asociadas. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un plan de pago y el perfil debe pertenecer a su cuenta. |
| Postcondiciones | Perfil eliminado correctamente; o eliminación rechazada por restricciones de negocio o falta de autorización. |
| Flujo principal | 1. El usuario ingresa al panel de perfiles y selecciona la opción de administrar perfiles. <br> 2. El usuario selecciona el perfil que desea eliminar.<br>3. El sistema solicita confirmación de la acción.<br>4. El usuario confirma la eliminación.<br>5. El sistema elimina el perfil seleccionado.<br>6. El sistema informa el resultado de la operación. |
| Flujos alternos | FA1. El usuario cancela la confirmación.<br>FA1.1 El sistema no realiza cambios.<br>FA2. El perfil seleccionado corresponde al perfil principal de la cuenta.<br>FA2.1 El sistema inhabilita la opcion de poder eliminar el perfil principal. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible eliminar el perfil. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Una cuenta debe conservar al menos un perfil activo.<br>Solo se pueden eliminar perfiles pertenecientes a la cuenta autenticada.<br>El perfil principal creado automáticamente con la cuenta no puede eliminarse. |
| Reglas de calidad | La confirmación debe prevenir eliminaciónes accidentales.<br>El sistema debe notificar claramente si la eliminación fue exitosa o rechazada. |

#### CDU-001.11 Configuración de Control Parental

| Campo | Especificación |
|----|----|
| Nombre | Configuración de Control Parental |
| Código | CDU-001.11 |
| Actores | Usuario |
| Descripción | Permite al usuario configurar o retirar un PIN restrictivo y definir la clasificación máxima que uno de sus perfiles puede reproducir sin solicitar dicho PIN. |
| Precondiciones | El usuario debe haber iniciado sesión y el perfil que desea configurar debe pertenecer a su cuenta. La configuración se realiza al editar un perfil existente. |
| Postcondiciones | El PIN queda almacenado de forma protegida y el nivel de control parental queda asociado al perfil; o ambos quedan desactivados cuando el usuario retira el PIN. |
| Flujo principal | 1. El usuario ingresa a la administración de perfiles.<br>2. El usuario habilita administración de perfiles y abre la edición del perfil deseado.<br>3. El usuario activa el PIN restrictivo.<br>4. El usuario ingresa un PIN numérico de cuatro dígitos.<br>5. El usuario selecciona la clasificación máxima permitida sin PIN: TP, PG-13 o R.<br>6. El usuario guarda los cambios.<br>7. El sistema valida y almacena el PIN cifrado mediante hash.<br>8. El sistema asocia el nivel seleccionado al perfil y confirma su actualización. |
| Flujos alternos | FA1. El usuario desactiva el PIN restrictivo.<br>FA1.1 El sistema limpia el PIN y el nivel de control parental del perfil.<br>FA2. El contenido seleccionado para reproducir supera el nivel configurado.<br>FA2.1 El sistema solicita el PIN antes de reproducir, reanudar o crear una Watch Party.<br>FA3. El usuario cancela la solicitud del PIN durante la reproducción.<br>FA3.1 El sistema no ejecuta la acción protegida. |
| Flujos de excepción | FE1. El PIN no contiene exactamente cuatro dígitos numéricos.<br>FE1.1 El sistema rechaza la configuración e informa la validación requerida.<br>FE2. El perfil no existe o no pertenece a la cuenta autenticada.<br>FE2.1 El sistema informa que el perfil no fue encontrado.<br>FE3. La sesión expiró o falla la persistencia de la configuración.<br>FE3.1 El sistema no completa la operación y muestra el error correspondiente. |
| Reglas de negocio | El PIN debe contener exactamente cuatro dígitos y se almacena mediante hash, no en texto plano.<br>Los únicos niveles admitidos son TP, PG-13 y R.<br>El PIN se solicita únicamente cuando el contenido tiene una clasificación superior al nivel del perfil y el perfil conserva tanto PIN como nivel configurado.<br>La configuración solo puede modificarse desde la cuenta propietaria del perfil. |
| Reglas de calidad | El campo de PIN debe ocultar su valor y aceptar únicamente caracteres numéricos.<br>La interfaz debe explicar qué contenidos requerirán PIN según el nivel seleccionado.<br>La configuración actualizada debe reflejarse en el perfil activo sin mezclar restricciones entre perfiles. |

### Expandidos de CDU002: Gestión de Suscripción y Pago

![CDU002](./img/CDU_CDU002.png)

- **CDU-002.1**: Visualización de Planes Disponibles
- **CDU-002.2**: Consulta de Tipo de Cambio de Moneda
- **CDU-002.3**: Contratación de Suscripción
- **CDU-002.4**: Modificación de Plan de Suscripción
- **CDU-002.5**: Cancelación de Suscripción
- **CDU-002.6**: Procesamiento de Pago
- **CDU-002.7**: Envío de Recibo de Compra

#### CDU-002.1 Visualización de Planes Disponibles

| Campo | Especificación |
|----|----|
| Nombre | Visualización de Planes Disponibles |
| Código | CDU-002.1 |
| Actores | Usuario |
| Descripción | Permite al usuario consultar los planes de suscripción disponibles con sus características y precio base antes de iniciar la contratación o modificación de plan. |
| Precondiciones | El usuario debe haber iniciado sesión. |
| Postcondiciones | Planes disponibles mostrados correctamente; o consulta no completada por falta de información disponible. |
| Flujo principal | 1. El usuario accede a la sección de ver planes de pago.<br>2. El sistema consulta los planes disponibles.<br>3. El sistema muestra nombre, características y precio base de cada plan.<br>4. El usuario revisa las opciones presentadas. |
| Flujos alternos | FA1. No existen planes configurados.<br>FA1.1 El sistema informa que no hay planes disponibles.<br>FA2. Ocurre un error al cargar la información.<br>FA2.1 El sistema informa que no pudo mostrar los planes. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible cargar los planes. Intenta nuevamente.<br>FE2. Servicio no disponible (error 500).<br>FE2.1 El sistema informa que ocurrió un error interno. Intenta nuevamente más tarde. |
| Reglas de negocio | Solo deben mostrarse planes vigentes y habilitados.<br>La visualización debe incluir las características principales del plan y su precio base. |
| Reglas de calidad | La carga de planes debe ser clara y comprensible.<br>Los precios deben presentarse de forma legible para el usuario. |

#### CDU-002.2 Consulta de Tipo de Cambio de Moneda

| Campo | Especificación |
|----|----|
| Nombre | Consulta de Tipo de Cambio de Moneda |
| Código | CDU-002.2 |
| Actores | Usuario, Proveedor de Divisas |
| Descripción | Permite al sistema obtener el tipo de cambio necesario para mostrar al usuario el valor del plan en la moneda local correspondiente a la ubicación registrada en su cuenta cuando inicia el proceso de compra o modificación de plan. |
| Precondiciones | El usuario debe haber seleccionado un plan e iniciado el flujo de compra o modificación, y el proveedor de divisas debe estar disponible. |
| Postcondiciones | Tipo de cambio consultado y precio convertido; o precio mostrado con información no actualizada o no disponible. |
| Flujo principal | 1. El usuario selecciona un plan e inicia el proceso de compra o modificación de plan.<br>2. El sistema obtiene la ubicación registrada del usuario.<br>3. El sistema identifica la moneda local correspondiente a esa ubicación.<br>4. El sistema solicita el tipo de cambio al proveedor de divisas.<br>5. El proveedor responde con la tasa vigente.<br>6. El sistema calcula el valor convertido.<br>7. El sistema muestra el monto en moneda local dentro del flujo de pago. |
| Flujos alternos | FA1. El proveedor de divisas no responde.<br>FA1.1 El sistema usa información en caché si está disponible.<br> FA2.2 El sistema no encuentra la divisa del usuario y cobra en dólares|
| Flujos de excepción | FE1. Error de conexión con Redis o PostgreSQL (cache de divisas).<br>FE1.1 El sistema consulta directamente la API externa de divisas.<br>FE2. API externa de divisas no responde (timeout).<br>FE2.1 El sistema informa que no fue posible obtener el tipo de cambio y muestra el precio en USD.<br>FE3. Error de conexión con la base de datos.<br>FE3.1 El sistema informa que no fue posible consultar la ubicación del usuario. |
| Reglas de negocio | La conversion depende de la moneda local asociada a la ubicación registrada del usuario.<br>La tasa obtenida puede reutilizarse desde caché según la política vigente. |
| Reglas de calidad | La consulta de tipo de cambio no debe degradar el flujo de compra.<br>La conversion mostrada debe ser consistente dentro de la misma operación. |

#### CDU-002.3 Contratación de Suscripción

| Campo | Especificación |
|----|----|
| Nombre | Contratación de Suscripción |
| Código | CDU-002.3 |
| Actores | Usuario |
| Descripción | Permite al usuario seleccionar un plan y solicitar la activación de una suscripción para obtener acceso al contenido de la plataforma. |
| Precondiciones | El usuario debe haber iniciado sesión y debe existir al menos un plan disponible para contratar. |
| Postcondiciones | Suscripción creada o pendiente de confirmación de pago; o contratación rechazada por error de validación o cobro. |
| Flujo principal | 1. El usuario previamente ha seleccionado un plan.<br>2. El sistema muestra el resumen de la contratación.<br>3. El usuario llena un formulario con sus datos de pago y confirma la compra .<br>4. El sistema inicia el flujo de pago asociado.<br>5. El sistema registra la solicitud de suscripción.<br>6. El usuario recibe una confirmacion por correo y es redirigido a una página de confirmación. |
| Flujos alternos |FA2. El usuario cancela la operación.<br>FA2.1 El sistema cierra el flujo sin cambios. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible registrar la suscripción. Intenta nuevamente.<br>FE2. Error en el procesamiento de pago.<br>FE2.1 El sistema informa que el pago fue rechazado y no activa la suscripción. |
| Reglas de negocio | La suscripción solo puede activarse si el plan está vigente.<br>La contratación debe quedar vinculada a la cuenta autenticada. |
| Reglas de calidad | El resumen de compra debe ser claro antes de confirmar.<br>La plataforma debe informar el estado de la contratación de forma visible. |

#### CDU-002.4 Modificación de Plan de Suscripción

| Campo | Especificación |
|----|----|
| Nombre | Modificación de Plan de Suscripción |
| Código | CDU-002.4 |
| Actores | Usuario |
| Descripción | Permite al usuario cambiar su plan activo por otro disponible desde la administración de la cuenta. |
| Precondiciones | El usuario debe haber iniciado sesión y contar con una suscripción activa. |
| Postcondiciones | Plan actualizado correctamente o pendiente de pago; o solicitud rechazada por restricciones de negocio o error de cobro. |
| Flujo principal | 1. El usuario consulta su suscripción activa desde las configuraciones de su cuenta.<br>2. El usuario selecciona un nuevo plan disponible.<br>3. El sistema muestra las condiciones del cambio.<br>4. El usuario confirma la modificación.<br>5. El sistema procesa la actualización correspondiente. |
| Flujos alternos | FA2. El usuario cancela la confirmación.<br>FA2.1 El sistema no realiza cambios. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible modificar el plan. Intenta nuevamente.<br>FE2. Error en el procesamiento de pago.<br>FE2.1 El sistema informa que el pago fue rechazado y mantiene el plan actual. |
| Reglas de negocio | Solo puede modificarse una suscripción activa.<br>El cambio debe aplicarse a un plan vigente y permitido. |
| Reglas de calidad | La diferencia entre el plan actual y el nuevo plan debe mostrarse claramente.<br>El resultado del cambio debe reflejarse en la cuenta sin ambigüedad. |

#### CDU-002.5 Cancelación de Suscripción

| Campo | Especificación |
|----|----|
| Nombre | Cancelación de Suscripción |
| Código | CDU-002.5 |
| Actores | Usuario |
| Descripción | Permite al usuario cancelar su suscripción activa desde la configuración de cuenta para detener futuras renovacíones o cobros asociados. |
| Precondiciones | El usuario debe haber iniciado sesión y tener una suscripción activa. |
| Postcondiciones | Suscripción cancelada correctamente; o cancelación rechazada por estado inválido o error del sistema. |
| Flujo principal | 1. El usuario accede a la administración de su suscripción desde los ajustes de su cuenta.<br>2. El usuario selecciona la opción de cancelar.<br>3. El sistema muestra las implicaciones de la cancelación.<br>4. El usuario confirma la solicitud.<br>5. El sistema actualiza el estado de la suscripción. |
| Flujos alternos | FA1. El usuario cancela la confirmación.<br>FA1.1 El sistema no realiza cambios.|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible cancelar la suscripción. Intenta nuevamente. |
| Reglas de negocio | Solo puede cancelarse una suscripción vigente.<br>La cuenta debe conservar el estado real de la suscripción después del proceso. |
| Reglas de calidad | La acción de cancelación debe requerir confirmación explícita.<br>El sistema debe mostrar el estado final de la suscripción de forma clara. |

#### CDU-002.6 Procesamiento de Pago

| Campo | Especificación |
|----|----|
| Nombre | Procesamiento de Pago |
| Código | CDU-002.6 |
| Actores | Usuario |
| Descripción | Permite al sistema registrar el cobro correspondiente a la contratación o modificación de un plan de suscripción mediante el procesamiento interno de pago. |
| Precondiciones | El usuario debe haber seleccionado una suscripción. |
| Postcondiciones | Pago registrado correctamente; o pago rechazado, cancelado o pendiente de confirmación. |
| Flujo principal | 1. El sistema presenta el resumen del pago al usuario.<br>2. El usuario llena un formulario con los datos de pago.<br>3. El usuario confirma la operación de pago.<br>4. El sistema valida los datos de la operación.<br>5. El sistema registra la transacción con estado correspondiente.<br>6. El sistema confirma el resultado al usuario. |
| Flujos alternos | FA1. El sistema rechaza la transacción por datos inválidos.<br>FA1.1 El sistema informa que el pago fue rechazado.<br>FA2. El usuario abandona el flujo de pago.<br>FA2.1 El sistema cancela la operación asociada. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible registrar el pago. Intenta nuevamente.<br>FE2. Servicio de divisas no responde.<br>FE2.1 El sistema informa que no fue posible calcular el monto en moneda local.<br>FE3. Servicio de notificaciones no responde.<br>FE3.1 El sistema registra el pago pero informa que no fue posible enviar el recibo por correo. |
| Reglas de negocio | El pago debe asociarse a una operación válida de suscripción.<br>La activación o cambio del plan depende del resultado del registro de pago. |
| Reglas de calidad | El resultado de la transacción debe notificarse claramente al usuario.<br>El registro de pago no debe bloquear la operación principal. |

#### CDU-002.7 Envío de Recibo de Compra

| Campo | Especificación |
|----|----|
| Nombre | Envío de Recibo de Compra |
| Código | CDU-002.7 |
| Actores | Usuario, Proveedor de Correo SMTP |
| Descripción | Permite al sistema enviar al usuario el comprobante de la operación de compra una vez confirmado el pago de su suscripción o modificación de plan. |
| Precondiciones | Debe existir una compra confirmada y un correo electrónico asociado a la cuenta del usuario. |
| Postcondiciones | Recibo enviado correctamente; o fallo de envío registrado por el sistema. |
| Flujo principal | 1. El sistema detecta que la compra fue confirmada.<br>2. El sistema prepara el recibo con el detalle de la operación.<br>3. El sistema solicita el envío al proveedor SMTP.<br>4. El servicio confirma el procesamiento del mensaje.<br>5. El sistema muestra el resultado del envío y permite descargar la constancia. |
| Flujos alternos | FA1. El proveedor SMTP no responde o rechaza la solicitud.<br>FA1.1 El sistema registra el fallo de envío.<br>FA2. No existe correo asociado a la cuenta.<br>FA2.1 El sistema registra la imposibilidad de envío. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema registra el fallo de envío sin reintentar.<br>FE2. Timeout del proveedor SMTP.<br>FE2.1 El sistema marca el recibo como no enviado y continúa. |
| Reglas de negocio | El recibo solo se envía cuando la compra ha sido confirmada.<br>El detalle del recibo debe corresponder a la operación realizada. |
| Reglas de calidad | El envío del recibo no debe bloquear la confirmación de la compra al usuario.<br>Los errores de envío deben quedar registrados para trazabilidad. |

### Expandidos de CDU003: Exploración de Catálogo de Contenido

![CDU003](./img/CDU_CDU003.png)

- **CDU-003.1**: Visualización de Catálogo de Contenido
- **CDU-003.2**: Búsqueda de Contenido
- **CDU-003.3**: Filtrado de Catálogo de Contenido
- **CDU-003.4**: Consulta de Detalle de Contenido
- **CDU-003.5**: Mostrar sección "Recomendados para ti"

#### CDU-003.1 Visualización de Catálogo de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Visualización de Catálogo de Contenido |
| Código | CDU-003.1 |
| Actores | Usuario |
| Descripción | Permite al usuario visualizar el conjunto de películas y series disponibles en la plataforma junto con su información básica de presentación. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo seleccionado y haber adquirido alguno de los planes de pago. |
| Postcondiciones | Catálogo mostrado correctamente. |
| Flujo principal | 1. El usuario accede a la sección principal del catálogo.<br>2. El sistema consulta el contenido disponible.<br>3. El sistema muestra la cartelera con títulos, portadas, calificacion, el tipo de contenido y fecha .<br>4. El usuario navega entre los elementos mostrados. <br>5. El usuario puede filtrar seleccionando mediante peliculas, series y su genero. <br> 6. El usuario puede ver el detalle de cada contenido. <br> 7. El usuario puede reproducir el contenido. |
| Flujos alternos | FA1. No existe contenido disponible.<br>FA1.1 El sistema informa que el catálogo está vacío.<br>FA2. Ocurre un error de carga.<br>FA2.1 El sistema informa que no pudo mostrar el catálogo. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible cargar el catálogo. Intenta nuevamente.<br>FE2. Error interno del servidor (500).<br>FE2.1 El sistema informa que ocurrió un error inesperado. Intenta nuevamente más tarde. |
| Reglas de negocio | Solo debe mostrarse contenido disponible para la plataforma.<br>La información básica del catálogo debe corresponder al contenido vigente. |
| Reglas de calidad | El catálogo debe cargarse de manera clara y ordenada.<br>La navegación debe ser legible tanto en escritorio como en pantallas reducidas. |

#### CDU-003.2 Búsqueda de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Búsqueda de Contenido |
| Código | CDU-003.2 |
| Actores | Usuario |
| Descripción | Permite al usuario localizar películas o series dentro del catálogo mediante criterios de texto relacionados con el titulo del contenido. |
| Precondiciones | El usuario debe haber iniciado sesión y tener acceso al catálogo. |
| Postcondiciones | Resultados de búsqueda mostrados correctamente; o lista vacía cuando no existen coincidencias. |
| Flujo principal | 1. El usuario ingresa un criterio de búsqueda.<br>2. El sistema procesa el término ingresado.<br>3. El sistema consulta los títulos de los contenidos que coinciden.<br>4. El sistema muestra los resultados encontrados. |
| Flujos alternos | FA1. No existen coincidencias.<br>FA1.1 El sistema informa que no se encontraron resultados.|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible realizar la búsqueda. Intenta nuevamente.<br>FE2. Timeout en la búsqueda.<br>FE2.1 El sistema informa que la búsqueda tardó demasiado. Intenta con un criterio más específico. |
| Reglas de negocio | La búsqueda debe operar sobre el contenido disponible en la plataforma.<br>Los resultados deben corresponder a coincidencias con el criterio ingresado. |
| Reglas de calidad | La respuesta de búsqueda debe ser rápida y comprensible.<br>Los resultados deben presentarse con un formato consistente con el catálogo. |

#### CDU-003.3 Filtrado de Catálogo de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Filtrado de Catálogo de Contenido |
| Código | CDU-003.3 |
| Actores | Usuario |
| Descripción | Permite al usuario restringir la visualización del catálogo según géneros o tipos de contenido para ubicar contenido acorde a sus intereses o necesidades de consulta. |
| Precondiciones | El usuario debe haber iniciado sesión y tener acceso al catálogo. |
| Postcondiciones | Catálogo filtrado mostrado correctamente; o sin resultados cuando el criterio aplicado no encuentra coincidencias. |
| Flujo principal | 1. El usuario selecciona uno o más criterios de filtrado.<br>2. El sistema aplica los filtros elegidos.<br>3. El sistema consulta los contenidos que cumplen los criterios.<br>4. El sistema muestra el catálogo filtrado. |
| Flujos alternos | FA1. Ningún contenido coincide con los filtros.<br>FA1.1 El sistema informa que no existen resultados|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible aplicar los filtros. Intenta nuevamente. |
| Reglas de negocio | Los filtros solo deben aplicarse sobre categorías y géneros configurados.<br>La combinación de filtros debe respetar el contenido disponible. |
| Reglas de calidad | La aplicación de filtros debe ser clara e intuitiva.<br>El usuario debe poder identificar fácilmente los filtros activos. |

#### CDU-003.4 Consulta de Detalle de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Consulta de Detalle de Contenido |
| Código | CDU-003.4 |
| Actores | Usuario |
| Descripción | Permite al usuario consultar la información detallada de una película o serie, incluyendo ficha técnica: sinopsis, género, director, idioma, subitutlos, clasificación, notas adicionales, junto a su ranking de recomendación. |
| Precondiciones | El usuario debe haber iniciado sesión y seleccionar un contenido existente del catálogo. |
| Postcondiciones | Detalle del contenido mostrado correctamente; o consulta rechazada por contenido inexistente o no disponible. |
| Flujo principal | 1. El usuario selecciona un contenido del catálogo.<br>2. El sistema consulta la información detallada del contenido.<br>3. El sistema muestra la ficha técnica <br>4. El usuario revisa la información presentada. |
| Flujos alternos | FA1. Ocurre un error al consultar la ficha.<br>FA1.1 El sistema informa la imposibilidad de cargar el detalle. |
| Flujos de excepción | FE1. Contenido no encontrado en la base de datos (404).<br>FE1.1 El sistema informa que el contenido no existe o fue retirado.<br>FE2. Error de conexión con la base de datos.<br>FE2.1 El sistema informa que no fue posible cargar el detalle. Intenta nuevamente. |
| Reglas de negocio | La información detallada debe corresponder al contenido seleccionado.<br>Solo debe mostrarse información de contenido disponible en el catálogo. |
| Reglas de calidad | La ficha técnica debe presentarse de forma organizada y legible.<br>La carga del detalle no debe romper la navegación del usuario. |

#### CDU-003.5 Mostrar sección "Recomendados para ti"

| Campo | Especificación |
|----|----|
| Nombre | Mostrar sección "Recomendados para ti" |
| Código | CDU-003.5 |
| Actores | Usuario |
| Descripción | Permite al usuario visualizar en el panel una fila de contenido recomendada específicamente para el perfil activo a partir de su historial, sus calificaciones y los géneros del catálogo. |
| Precondiciones | El usuario debe haber iniciado sesión, tener una suscripción activa y un perfil activo válido. |
| Postcondiciones | La sección muestra hasta diez contenidos ordenados por afinidad para el perfil; o se omite cuando no hay resultados o no se pueden obtener recomendaciones. |
| Flujo principal | 1. El usuario ingresa al panel con un perfil activo.<br>2. El sistema solicita hasta diez recomendaciones para el identificador del perfil.<br>3. El servicio de Streaming consulta los últimos 25 registros del historial, las calificaciones del perfil y el catálogo disponible.<br>4. El sistema calcula la afinidad por géneros, considerando la recencia, el avance, la finalización y las reacciones like o dislike.<br>5. El sistema excluye el contenido ya reproducido y ordena los candidatos por puntaje; en caso de empate, utiliza el porcentaje de recomendación global.<br>6. El panel muestra los resultados en la fila "Recomendados para ti". |
| Flujos alternos | FA1. El perfil no posee historial ni calificaciones.<br>FA1.1 El sistema aplica un arranque en frío y ordena el catálogo no visto por su recomendación global, indicando que es popular en el catálogo.<br>FA2. El usuario filtra el panel por películas o series.<br>FA2.1 La sección conserva únicamente recomendaciones del tipo seleccionado.<br>FA3. La lista resultante está vacía.<br>FA3.1 El panel omite la fila "Recomendados para ti". |
| Flujos de excepción | FE1. No se puede consultar el historial, las calificaciones o el catálogo.<br>FE1.1 El servicio informa que no pudo generar las recomendaciones.<br>FE2. El frontend no puede obtener la respuesta del servicio de Streaming.<br>FE2.1 El panel continúa mostrando las demás secciones y omite las recomendaciones personalizadas. |
| Reglas de negocio | Las recomendaciones se calculan por perfil y no se comparten entre perfiles de una cuenta.<br>El contenido ya reproducido no vuelve a recomendarse.<br>Un like incrementa la afinidad por los géneros relacionados y un dislike la reduce.<br>La popularidad global participa en el puntaje de todos los candidatos.<br>La consulta del panel solicita un máximo de diez recomendaciones. |
| Reglas de calidad | Un fallo del recomendador no debe impedir la carga del resto del catálogo.<br>Los resultados deben conservar el formato visual de las demás filas del panel.<br>El cálculo debe producir un orden estable y explicable por afinidad o popularidad. |

### Expandidos de CDU004: Calificación de Contenido

![CDU004](./img/CDU_CDU004.png)

- **CDU-004.1**: Calificación de Contenido
- **CDU-004.2**: Consulta de Recomendación Global del Contenido

#### CDU-004.1 Calificación de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Calificación de Contenido |
| Código | CDU-004.1 |
| Actores | Usuario |
| Descripción | Permite al usuario emitir una reacción de like o dislike sobre una película o serie desde el perfil activo de su cuenta. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo y seleccionar un contenido disponible. |
| Postcondiciones | Calificación registrada o actualizada correctamente; o acción rechazada por contenido inválido o perfil no autorizado. |
| Flujo principal | 1. El usuario accede al detalle de un contenido.<br>2. El usuario selecciona like o dislike.<br>3. El sistema valida la identidad del perfil activo.<br>4. El sistema registra o actualiza la calificación.<br>5. El sistema registra el criterio del usuario |
| Flujos alternos | FA1. El contenido no admite calificación por error de disponibilidad.<br>FA1.1 El sistema rechaza la operación.<br>FA2. El usuario cambia una calificación previa.<br>FA2.1 El sistema reemplaza la reacción anterior por la nueva. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible registrar la calificación. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | Cada perfil solo puede mantener una calificación vigente por contenido.<br>La calificación puede actualizarse posteriormente. |
| Reglas de calidad | La reacción seleccionada debe reflejarse de forma inmediata en la interfaz.<br>El sistema debe evitar registros duplicados para el mismo perfil y contenido. |

#### CDU-004.2 Consulta de Recomendación Global del Contenido

| Campo | Especificación |
|----|----|
| Nombre | Consulta de Recomendación Global del Contenido |
| Código | CDU-004.2 |
| Actores | Usuario |
| Descripción | Permite al usuario consultar la recomendación global de un contenido, calculada a partir de las reacciones positivas y negativas registradas por la comunidad. |
| Precondiciones | El contenido debe existir y contar con información de recomendación disponible. |
| Postcondiciones | Recomendación global mostrada correctamente; o indicador no disponible por falta de datos. |
| Flujo principal | 1. El usuario visualiza un contenido en el catálogo o su detalle.<br>2. El sistema obtiene la recomendación global asociada.<br>3. El sistema presenta el indicador consolidado al usuario. |
| Flujos alternos | FA1. El contenido aún no tiene calificaciónes.<br>FA1.1 El sistema informa que no existe recomendación disponible.<br>FA2. Ocurre un error al consultar el indicador.<br>FA2.1 El sistema omite temporalmente la recomendación. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible calcular la recomendación. Intenta nuevamente.<br>FE2. Contenido sin calificaciones.<br>FE2.1 El sistema informa que aún no hay recomendación disponible. |
| Reglas de negocio | La recomendación global debe basarse en las calificaciónes de la comunidad.<br>El indicador debe corresponder al contenido consultado. |
| Reglas de calidad | El indicador debe mostrarse de forma clara y consistente en la interfaz.<br>La consulta no debe afectar perceptiblemente la carga del catálogo. |

### Expandidos de CDU005: Reproducción e Historial

![CDU005](./img/CDU_CDU005.png)

- **CDU-005.1**: Reproducción de Contenido
- **CDU-005.2**: Reanudación de Reproducción
- **CDU-005.3**: Consulta de Historial de Reproducción
- **CDU-005.4**: Creación de Watch Party
- **CDU-005.5**: Ingreso a Watch Party
- **CDU-005.6**: Descarga de Contenido

#### CDU-005.1 Reproducción de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Reproducción de Contenido |
| Código | CDU-005.1 |
| Actores | Usuario |
| Descripción | Permite al usuario iniciar la reproducción de una película o serie disponible utilizando el perfil activo de su cuenta. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo y contar con una suscripción válida para el contenido solicitado. |
| Postcondiciones | Reproducción iniciada correctamente; o acceso denegado por falta de permisos, suscripción o disponibilidad del contenido. |
| Flujo principal | 1. El usuario selecciona un contenido disponible.<br>2. El sistema valida la suscripción y el acceso del perfil activo.<br>3. El sistema prepara la reproducción del contenido.<br>4. El sistema inicia la reproducción para el usuario. |
| Flujos alternos | FA1. El usuario no tiene una suscripción.<br>FA1.1 El sistema incita a comprar una suscripción.<br>FA2. El contenido no está disponible.<br>FA2.1 El sistema informa que no puede reproducirse.<br>FA3. El perfil activo tiene control parental con PIN y el contenido seleccionado supera la clasificación permitida para el perfil.<br>FA3.1 El sistema consulta las restricciones del perfil y solicita el PIN de seguridad antes de iniciar la reproducción.<br>FA3.2 El usuario ingresa el PIN solicitado.<br>FA3.3 El sistema verifica el PIN; si es correcto, inicia la reproducción del contenido.<br>FA4. El usuario cancela la solicitud del PIN o ingresa un PIN incorrecto.<br>FA4.1 El sistema no inicia la reproducción y mantiene al usuario en el detalle del contenido. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible validar la suscripción. Intenta nuevamente.<br>FE2. Error de conexión con el servicio de streaming.<br>FE2.1 El sistema informa que no fue posible iniciar la reproducción. Intenta nuevamente. |
| Reglas de negocio | Solo puede reproducirse contenido disponible para una cuenta con acceso válido.<br>La reproducción debe quedar asociada al perfil activo.<br>Cuando el perfil tiene PIN y control parental configurados, el sistema debe solicitar el PIN si la clasificación del contenido es superior al nivel permitido del perfil. |
| Reglas de calidad | El inicio de reproducción debe ocurrir con el menor retraso posible.<br>Los mensajes de restricción de acceso deben ser claros para el usuario. |

#### CDU-005.2 Reanudación de Reproducción

| Campo | Especificación |
|----|----|
| Nombre | Reanudación de Reproducción |
| Código | CDU-005.2 |
| Actores | Usuario |
| Descripción | Permite al usuario continuar una película o serie desde el ultimo punto registrado en el historial del perfil activo. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo y existir un progreso previo registrado para el contenido. |
| Postcondiciones | Reproducción reanudada desde el punto guardado; o reproducción iniciada desde el comienzo si no existe progreso utilizable. |
| Flujo principal | 1. El usuario selecciona reanudar un contenido previamente visto desde su panel de historial.<br>2. El sistema consulta el ultimo progreso registrado del perfil activo.<br>3. El sistema posiciona el contenido en el punto recuperado.<br>4. El sistema inicia la reproducción desde ese punto. |
| Flujos alternos | FA1. El progreso registrado es inválido o inconsistente.<br>FA1.1 El sistema reinicia desde el comienzo. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible recuperar el progreso. Inicia desde el principio.<br>FE2. Progreso inválido o corrupto en la base de datos.<br>FE2.1 El sistema reinicia la reproducción desde el comienzo. |
| Reglas de negocio | La reanudación debe basarse en el historial del perfil activo.<br>El punto de reanudación debe corresponder al contenido seleccionado. |
| Reglas de calidad | El punto recuperado debe ser preciso y consistente.<br>La reanudación no debe requerir pasos innecesarios del usuario. |

#### CDU-005.3 Consulta de Historial de Reproducción

| Campo | Especificación |
|----|----|
| Nombre | Consulta de Historial de Reproducción |
| Código | CDU-005.3 |
| Actores | Usuario |
| Descripción | Permite al usuario revisar el historial reciente del perfil activo para identificar contenidos vistos o pendientes de continuar. |
| Precondiciones | El usuario debe haber iniciado sesión y tener un perfil activo, un plan de pago y un contenido previamente visto. |
| Postcondiciones | Historial mostrado correctamente; o lista vacía si no existen reproducciones registradas. |
| Flujo principal | 1. El usuario accede a la sección de historial.<br>2. El sistema consulta las reproducciones asociadas al perfil activo.<br>3. El sistema muestra la lista reciente con su estado de avance.<br>4. El usuario revisa los contenidos registrados. |
| Flujos alternos | FA1. El perfil no tiene historial registrado.<br>FA1.1 El sistema informa que aún no existen reproducciones recientes.<br>FA2. Ocurre un error al recuperar la información.<br>FA2.1 El sistema informa que no pudo mostrar el historial. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible cargar el historial. Intenta nuevamente.<br>FE2. Sesión expirada.<br>FE2.1 El sistema redirige al usuario a la pantalla de inicio de sesión. |
| Reglas de negocio | El historial debe pertenecer exclusivamente al perfil activo.<br>Las reproducciones de otros perfiles no deben mezclarse. |
| Reglas de calidad | La información del historial debe ser clara y ordenada.<br>La consulta debe responder sin afectar la experiencia de navegación. |

#### CDU-005.4 Creación de Watch Party

| Campo | Especificación |
|----|----|
| Nombre | Creación de Watch Party |
| Código | CDU-005.4 |
| Actores | Usuario |
| Descripción | Permite al usuario con Plan Premium crear desde el detalle de un contenido una sala de reproducción sincronizada y obtener un código de invitación para otros participantes. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo, contar con un Plan Premium activo y haber abierto un contenido existente. |
| Postcondiciones | Sala activa creada con el usuario como anfitrión, código único de invitación generado y navegación realizada hacia la Watch Party; o creación rechazada sin abrir una sala. |
| Flujo principal | 1. El usuario abre el detalle de un contenido y selecciona Watch Party.<br>2. El sistema verifica que la cuenta tenga el Plan Premium.<br>3. El sistema comprueba las restricciones parentales del perfil.<br>4. El sistema registra una sala asociada al perfil, la cuenta y el contenido, con reproducción pausada y posición inicial en cero.<br>5. El sistema genera un código único de invitación de ocho caracteres.<br>6. El sistema redirige al usuario a la sala usando el código generado.<br>7. El sistema conecta al anfitrión mediante WebSocket y muestra las opciones para copiar el código o el enlace de invitación. |
| Flujos alternos | FA1. La cuenta no tiene Plan Premium.<br>FA1.1 El sistema muestra la restricción Premium y no crea la sala.<br>FA2. El contenido supera el nivel de control parental del perfil.<br>FA2.1 El sistema solicita el PIN y solo crea la sala si la verificación es correcta.<br>FA3. El usuario cancela la solicitud del PIN o ingresa uno incorrecto.<br>FA3.1 El sistema no crea la sala. |
| Flujos de excepción | FE1. El servicio de Suscripción no responde o no puede verificar el plan.<br>FE1.1 El sistema informa que ocurrió un error al verificar el plan.<br>FE2. La sala no puede persistirse en la base de datos.<br>FE2.1 El sistema informa que no pudo crear la sala.<br>FE3. Falla la conexión WebSocket después de crear la sala.<br>FE3.1 La interfaz informa el error de conexión e intenta restablecerla. |
| Reglas de negocio | Solo una cuenta con el identificador del Plan Premium puede crear una Watch Party.<br>La sala debe quedar asociada al perfil y la cuenta que la crean.<br>El creador de la sala es el anfitrión.<br>El código de invitación debe ser único entre las salas activas.<br>Solo el anfitrión controla la reproducción sincronizada. |
| Reglas de calidad | La creación debe informar claramente los errores de plan, PIN o persistencia.<br>El código y el enlace de invitación deben poder copiarse desde la sala.<br>La reproducción, pausa y desplazamiento del anfitrión deben propagarse en tiempo real. |

#### CDU-005.5 Ingreso a Watch Party

| Campo | Especificación |
|----|----|
| Nombre | Ingreso a Watch Party |
| Código | CDU-005.5 |
| Actores | Usuario |
| Descripción | Permite al usuario ingresar con su perfil activo a una Watch Party mediante el código compartido por el anfitrión para seguir la reproducción sincronizada y utilizar el chat de la sala. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo y disponer del código de una sala activa. |
| Postcondiciones | El perfil queda registrado o reconectado como participante y conectado a la sala; o permanece fuera cuando el código no corresponde a una sala activa. |
| Flujo principal | 1. El usuario accede a Watch Party y selecciona "Unirse con código".<br>2. El usuario ingresa el código de invitación.<br>3. El sistema normaliza el código a mayúsculas y consulta la sala activa.<br>4. El sistema actualiza la URL con el código y establece una conexión WebSocket.<br>5. El sistema registra al perfil como participante, o reutiliza su registro si ya pertenecía a la sala.<br>6. El sistema obtiene el video mediante una URL vigente y sincroniza el estado y la posición con la sala.<br>7. El sistema muestra los participantes y habilita el chat en vivo. |
| Flujos alternos | FA1. El usuario abre directamente un enlace que contiene el código.<br>FA1.1 El sistema intenta el ingreso automáticamente.<br>FA2. El perfil ya estaba registrado en la sala.<br>FA2.1 El sistema reutiliza el participante y restablece su conexión.<br>FA3. El anfitrión abandona la sala.<br>FA3.1 El sistema muestra una cuenta regresiva de 15 segundos y devuelve a los participantes a la pantalla de Watch Party. |
| Flujos de excepción | FE1. El código es inválido o la sala ya finalizó.<br>FE1.1 El sistema informa el error y vuelve a mostrar el formulario de ingreso.<br>FE2. Se pierde la conexión WebSocket.<br>FE2.1 El sistema informa la pérdida de conexión e intenta reconectarse cada tres segundos.<br>FE3. No se puede obtener el video.<br>FE3.1 El sistema mantiene la sala e informa que el video no pudo cargarse. |
| Reglas de negocio | El ingreso requiere una sala activa y un perfil identificado.<br>El código generado por el sistema contiene ocho caracteres, aunque la interfaz admite el envío desde cuatro caracteres para validarlo contra el servidor.<br>La validación de Plan Premium se realiza al crear la sala; el flujo actual de ingreso por código no vuelve a exigir dicho plan.<br>Los participantes que no son anfitriones siguen el estado de reproducción del anfitrión. |
| Reglas de calidad | La sincronización debe propagar reproducción, pausa y desplazamientos sin recargar la página.<br>La conexión debe enviar latidos periódicos y reintentar ante una interrupción.<br>La salida o reconexión de participantes debe reflejarse en la lista de la sala. |

#### CDU-005.6 Descarga de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Descarga de Contenido |
| Código | CDU-005.6 |
| Actores | Usuario |
| Descripción | Permite al usuario con Plan Premium guardar localmente y de forma cifrada un registro de una película o episodio para consultarlo desde "Mis descargas". La implementación es una descarga simulada y no almacena el archivo de video. |
| Precondiciones | El usuario debe haber iniciado sesión, tener un perfil activo, contar con un Plan Premium activo y abrir un contenido disponible. Para una serie debe seleccionar un episodio. |
| Postcondiciones | Registro cifrado guardado en IndexedDB e identificado por cuenta, perfil, contenido y episodio; o descarga no creada cuando el permiso o el almacenamiento local no están disponibles. |
| Flujo principal | 1. El usuario abre el detalle de una película o selecciona un episodio de una serie.<br>2. El usuario presiona el botón de descarga.<br>3. El sistema verifica la suscripción y el permiso `puede_descargar` de la cuenta.<br>4. El sistema prepara los metadatos del contenido para la cuenta y el perfil activos.<br>5. El navegador cifra el registro con AES-GCM de 256 bits y un vector de inicialización aleatorio.<br>6. El sistema guarda el registro en IndexedDB con una clave no extraíble.<br>7. El sistema confirma que la descarga simulada fue guardada.<br>8. El usuario puede consultarla, abrir el contenido en línea o eliminarla desde "Mis descargas". |
| Flujos alternos | FA1. La cuenta no tiene Plan Premium activo.<br>FA1.1 El sistema bloquea la operación e invita al usuario a activar o consultar el Plan Premium.<br>FA2. La serie no tiene un episodio seleccionado.<br>FA2.1 El sistema solicita seleccionar un episodio.<br>FA3. Ya existe un registro para la misma cuenta, perfil, contenido y episodio.<br>FA3.1 El sistema actualiza la descarga simulada existente.<br>FA4. El usuario abre un registro desde "Mis descargas".<br>FA4.1 El sistema navega al contenido y solicita una URL de reproducción vigente; no reproduce un archivo local. |
| Flujos de excepción | FE1. IndexedDB o Web Crypto API no están disponibles o fallan.<br>FE1.1 El sistema informa que no pudo guardar la descarga local.<br>FE2. No se puede consultar el estado de la suscripción.<br>FE2.1 El sistema no habilita la descarga y muestra el error de consulta.<br>FE3. Un registro almacenado no puede descifrarse.<br>FE3.1 El sistema elimina el registro inválido y no lo muestra en la lista. |
| Reglas de negocio | Solo el Plan Premium activo obtiene `puede_descargar: true`.<br>La descarga es simulada: se almacenan metadatos, no el archivo multimedia ni URLs firmadas.<br>Los registros se separan por cuenta, perfil, contenido y episodio.<br>Si la cuenta deja de ser Premium, los registros permanecen cifrados pero no pueden consultarse ni abrirse desde la pantalla de descargas.<br>Las descargas de otros perfiles no deben mostrarse en el perfil activo. |
| Reglas de calidad | Los registros deben cifrarse con AES-GCM de 256 bits y una clave no extraíble.<br>La lista debe ordenarse desde la descarga más reciente.<br>La falta de permiso debe comunicarse sin borrar los registros cifrados existentes. |

### Expandidos de CDU006: Administración de Contenido

![CDU006](./img/CDU_CDU006.png)

- **CDU-006.1**: Registro de Contenido
- **CDU-006.2**: Envío de Alerta de Nuevo Contenido
- **CDU-006.3**: Modificación de Contenido
- **CDU-006.4**: Eliminación de Contenido

#### CDU-006.1 Registro de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Registro de Contenido |
| Código | CDU-006.1 |
| Actores | Administrador |
| Descripción | Permite al administrador registrar una nueva película o serie en el catálogo de la plataforma con su información general y técnica. |
| Precondiciones | El administrador debe haber iniciado sesión con permisos vigentes de gestión de contenido. |
| Postcondiciones | Contenido registrado correctamente y disponible para el catálogo; o registro rechazado por datos inválidos o incompletos. |
| Flujo principal | 1. El administrador accede al módulo de películas o series.<br>2. El administrador ingresa la información del nuevo contenido por medio de un formulario.<br>3. El administrador fija la fecha de publicación.<br>4. El sistema valida los datos proporcionados.<br>5. El sistema registra el contenido en el catálogo.|
| Flujos alternos | FA1. Faltan datos obligatorios del contenido.<br>FA1.1 El sistema solicita completar la información.|
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible registrar el contenido. Intenta nuevamente.<br>FE2. Timeout en el envío de alertas de nuevo contenido (20s).<br>FE2.1 El sistema registra el contenido pero informa que no fue posible enviar las alertas. |
| Reglas de negocio | Solo administradores autorizados pueden registrar contenido.<br>El contenido debe contar con la información mínima requerida para publicarse. |
| Reglas de calidad | El formulario administrativo debe validar la información antes de guardar.<br>La confirmación del registro debe ser clara para el administrador. |

#### CDU-006.2 Envío de Alerta de Nuevo Contenido

| Campo | Especificación |
|----|----|
| Nombre | Envío de Alerta de Nuevo Contenido |
| Código | CDU-006.2 |
| Actores | Administrador, Proveedor de Correo SMTP |
| Descripción | Permite al sistema enviar una notificación por correo a los usuarios suscritos cuando un nuevo contenido ha sido registrado y publicado en la plataforma. |
| Precondiciones | Debe existir un contenido nuevo registrado correctamente y una base de usuarios destinatarios habilitados para recibir alertas. |
| Postcondiciones | Alerta enviada correctamente; o fallo de envío registrado por el sistema. |
| Flujo principal | 1. El sistema detecta el registro exitoso de un nuevo contenido.<br>2. El sistema prepara el mensaje de alerta.<br>3. El sistema solicita el envío al proveedor SMTP.<br>4. El proveedor procesa la entrega de los correos.<br>5. El sistema registra el resultado del envío. |
| Flujos alternos | FA1. El proveedor SMTP no responde o rechaza la solicitud.<br>FA1.1 El sistema registra el fallo de envío.<br>FA2. No existen usuarios elegibles para recibir la alerta.<br>FA2.1 El sistema cierra el proceso sin destinatarios. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema registra el fallo de envío sin reintentar.<br>FE2. Timeout del proveedor SMTP.<br>FE2.1 El sistema marca las alertas como fallidas y continúa. |
| Reglas de negocio | La alerta solo se envía cuando el contenido es nuevo y ha sido registrado correctamente.<br>Los destinatarios deben corresponder a usuarios habilitados para recibir notificaciones. |
| Reglas de calidad | El resultado del envío debe quedar registrado para auditoría.<br>El envío de la alerta no debe bloquear el flujo principal de registro de contenido. |

#### CDU-006.3 Modificación de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Modificación de Contenido |
| Código | CDU-006.3 |
| Actores | Administrador |
| Descripción | Permite al administrador actualizar la información de una película o serie ya registrada en el catálogo de la plataforma. |
| Precondiciones | El administrador debe haber iniciado sesión y el contenido a modificar debe existir. |
| Postcondiciones | Contenido actualizado correctamente; o modificación rechazada por datos inválidos o contenido inexistente. |
| Flujo principal | 1. El administrador selecciona un contenido existente y selecciona el botón de editar.<br>2. El administrador actualiza la información necesaria.<br>3. El sistema valida los cambios propuestos.<br>4. El sistema guarda la nueva información.<br>5. El sistema muestra la modificación del contenido. |
| Flujos alternos | FA1. Los cambios no cumplen las validaciones.<br>FA1.1 El sistema solicita corregir la información. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible modificar el contenido. Intenta nuevamente. |
| Reglas de negocio | Solo administradores autorizados pueden modificar contenido.<br>La modificación debe aplicarse sobre contenido previamente registrado. |
| Reglas de calidad | Los cambios deben reflejarse con consistencia en el catálogo.<br>La interfaz debe mostrar claramente si la actualización fue exitosa o rechazada. |

#### CDU-006.4 Eliminación de Contenido

| Campo | Especificación |
|----|----|
| Nombre | Eliminación de Contenido |
| Código | CDU-006.4 |
| Actores | Administrador |
| Descripción | Permite al administrador eliminar una película o serie del catálogo cuando ya no debe permanecer disponible en la plataforma. |
| Precondiciones | El administrador debe haber iniciado sesión y el contenido a eliminar debe existir en el catálogo. |
| Postcondiciones | Contenido eliminado correctamente; o eliminación rechazada por contenido inexistente. |
| Flujo principal | 1. El administrador selecciona el contenido y selecciona el botón de Borrar.<br>2. El sistema solicita confirmación de la acción.<br>3. El administrador confirma la eliminación.<br>4. El sistema retira el contenido del catálogo. |
| Flujos alternos | FA1. El administrador cancela la confirmación.<br>FA1.1 El sistema no realiza cambios. |
| Flujos de excepción | FE1. Error de conexión con la base de datos.<br>FE1.1 El sistema informa que no fue posible eliminar el contenido. Intenta nuevamente. |
| Reglas de negocio | Solo administradores pueden eliminar contenido.<br>La eliminación debe aplicarse únicamente a contenidos existentes. |
| Reglas de calidad | La acción debe requerir confirmación explícita para evitar errores.<br>El sistema debe mostrar un mensaje claro sobre el resultado final. |

### Expandidos de CDU007: Consulta de Auditoría

![CDU007](./img/CDU_CDU007.png)

- **CDU-007.1**: Consulta de Tabla de Auditoría
- **CDU-007.2**: Consultar Dashboard de rendimiento

#### CDU-007.1 Consulta de Tabla de Auditoría

| Campo | Especificación |
|----|----|
| Nombre | Consulta de Tabla de Auditoría |
| Código | CDU-007.1 |
| Actores | Administrador |
| Descripción | Permite al administrador visualizar los registros de auditoría generados automáticamente por triggers de base de datos sobre las operaciones del catálogo. |
| Precondiciones | El administrador debe haber iniciado sesión con una cuenta activa y rol de administrador.<br>Deben existir permisos vigentes para acceder al panel administrativo.<br>La tabla de auditoría del catálogo debe estar disponible. |
| Postcondiciones | Eventos de auditoría mostrados correctamente; o consulta rechazada por falta de autorización, sesión inválida o error de consulta. |
| Flujo principal | 1. El administrador ingresa al panel administrativo.<br>2. El administrador selecciona la opción Auditoría del menú lateral.<br>3. El sistema valida que la sesión exista y que la cuenta tenga rol de administrador.<br>4. El sistema solicita al servicio de catálogo los registros de auditoría más recientes.<br>5. El servicio de catálogo valida el token administrativo y consulta la tabla `instantaneas` ordenada por fecha de evento descendente.<br>6. El sistema muestra la tabla de auditoría con fecha, evento, usuario responsable, tabla afectada, entidad y cambios registrados.<br>7. El administrador revisa los eventos de inserción, actualización o eliminación del catálogo. |
| Flujos alternos | FA1. El administrador actualiza la consulta.<br>FA1.1 El sistema vuelve a solicitar los registros más recientes y refresca la tabla.<br>FA2. El administrador descarga la información.<br>FA2.1 El sistema genera un archivo CSV, Excel o PDF con los eventos cargados en pantalla.<br>FA3. No existen eventos registrados.<br>FA3.1 El sistema muestra la tabla sin registros e informa que no hay eventos disponibles. |
| Flujos de excepción | FE1. Sesión inexistente o token expirado.<br>FE1.1 El sistema redirige al administrador a la pantalla de inicio de sesión.<br>FE2. La cuenta autenticada no tiene rol de administrador.<br>FE2.1 El sistema bloquea el acceso al panel de auditoría y redirige al panel de usuario.<br>FE3. Error de conexión con la base de datos del catálogo.<br>FE3.1 El sistema informa que no fue posible consultar la auditoría del catálogo. |
| Reglas de negocio | Solo administradores autorizados pueden consultar la auditoría del catálogo.<br>Los eventos de auditoría deben originarse desde triggers de base de datos sobre operaciones de inserción, actualización y eliminación.<br>La consulta debe limitar la cantidad de registros retornados para evitar sobrecarga del servicio. |
| Reglas de calidad | La tabla debe presentar los eventos en orden cronológico descendente para facilitar la revisión reciente.<br>La exportación debe conservar los datos relevantes de la auditoría mostrada.<br>Los errores de autorización o sesión deben informarse sin exponer detalles sensibles. |

#### CDU-007.2 Consultar Dashboard de rendimiento

| Campo | Especificación |
|----|----|
| Nombre | Consultar Dashboard de rendimiento |
| Código | CDU-007.2 |
| Actores | Administrador |
| Descripción | Permite al administrador consultar un dashboard de rendimiento del sistema, mostrando métricas clave del estado del sistema de streaming. |
| Precondiciones | El administrador debe haber iniciado sesión con una cuenta activa.<br>El administrador tiene acceso y una sesión activa en Grafana. |
| Postcondiciones | El administrador visualiza el dashboard con las métricas actualizadas. |
| Flujo principal | 1. El administrador accede a la sección de dashboard desde la página principal de Grafana.<br>2. El sistema recupera y muestra las métricas clave del sistema.<br>3. El administrador visualiza las métricas y los gráficos para obtener información operativa. |
| Flujos de excepción | FE1. No hay conexión a prometheus para obtener las métricas.<br>FE1.1 El sistema muestra un mensaje de error indicando que no se pueden recuperar las métricas. |

[Volver al documentación](../Documentación.md) 

## Archivo Crudo

[Ver archivo crudo en Google Drive](https://drive.google.com/file/d/1-7d4d3Pj1QFCz0UsUmbK2urZZfRV0hyu/view?usp=sharing)
