# Diagrama de Arquitectura

## Introducción

El presente diagrama de arquitectura representa la solución propuesta para la plataforma de streaming **Quetxal TV**, desarrollada conforme al enunciado del proyecto. La arquitectura adopta un enfoque de **microservicios** con comunicación **sincrónica mediante gRPC**, un **API Gateway** como punto único de entrada y una distribución **políglota** de servicios implementados con **Python, Go y TypeScript**. Esta decisión responde a los requisitos de escalabilidad, desacoplamiento, mantenibilidad y soporte para múltiples dominios de negocio dentro de la plataforma.

Además, el diagrama refleja restricciones clave del enunciado, como el uso obligatorio de **JWT**, **Session Cookies**, **Redis** para caché de divisas, **Docker** para contenerización, el patrón **Database per Microservice** y el despliegue obligatorio en **Google Cloud Platform**. En conjunto, esta vista permite entender cómo interactúan los componentes principales del sistema y cómo se distribuyen las responsabilidades técnicas y funcionales.

## Descripción general del diagrama

El diagrama muestra una arquitectura sincrónica desplegada en **Google Cloud Platform**, donde el cliente accede al sistema a través de una aplicación web construida con **React + Vite**. Tanto el usuario final como el administrador consumen la plataforma por medio de solicitudes **HTTPS**, las cuales llegan primero al **API Gateway**. Este componente actúa como único punto de entrada, cumpliendo con el requisito del enunciado de impedir el acceso directo del cliente a los microservicios internos.

El **API Gateway** centraliza funciones de seguridad y enrutamiento. En esta capa se gestionan los mecanismos de autenticación y sesión, específicamente el uso de **JWT** para la propagación de identidad entre servicios y **cookies** para el mantenimiento de sesión del cliente. A partir de este punto, la comunicación hacia el ecosistema backend se realiza exclusivamente mediante **gRPC**, lo que garantiza contratos estrictos y una integración uniforme entre servicios escritos en distintos lenguajes.

## Microservicios identificados

La solución se divide en varios microservicios, cada uno asociado a un dominio de negocio específico y a su propia base de datos:

### 1. Servicio de Usuarios y Autenticación

Este microservicio, implementado en **Python**, gestiona el registro, inicio de sesión y administración de perfiles. Su responsabilidad está alineada con el módulo de **Autenticación, Gestión de Sesiones y Multiperfil** descrito en el enunciado. También se conecta con **Usuarios DB**, manteniendo de forma aislada la información de cuentas, credenciales y perfiles por usuario.

### 2. Servicio de Streaming y Progreso

Desarrollado en **Go**, este servicio administra la reproducción y el avance del contenido. Atiende el requisito de **Historial de reproducción reciente**, almacenando el progreso de visualización por perfil y permitiendo reanudar series o películas desde el punto exacto donde fueron pausadas. Para ello utiliza su propia base de datos, **Streaming DB**.

### 3. Servicio de Catálogo

También desarrollado en **Go**, este microservicio se encarga de la consulta de películas y series, soportando búsquedas, filtrado y visualización de detalles del contenido. Su base dedicada, **Catalogo DB**, permite aislar la información del catálogo, géneros, fichas técnicas y posiblemente la relación con actores o metadatos adicionales.

### 4. Servicio de Calificaciones

Implementado en **Go**, este servicio administra las valoraciones y recomendaciones de la comunidad. Su función responde al módulo de **Sistema de Calificaciones Dinámico**, donde los usuarios pueden calificar contenido y el sistema calcula un porcentaje global de recomendación. El almacenamiento se realiza en **Calificaciones DB**, favoreciendo el desacoplamiento del dominio de ratings respecto al resto de la plataforma.

### 5. Servicio de Suscripciones

Este microservicio, desarrollado en **Python**, administra planes, membresías y validación del acceso según la suscripción activa del usuario. Cumple directamente con el módulo de **Gestión de Planes y Suscripciones**, permitiendo consultar, modificar o cancelar planes. Opera con su propia base de datos, **Suscripciones DB**.

### 6. Servicio de Cobros

Desarrollado en **TypeScript**, este servicio gestiona pagos y recibos. Se integra con el servicio de suscripciones para formalizar la contratación o renovación de planes y utiliza **Cobros DB** como almacenamiento independiente. Además, consulta al servicio financiero para obtener el tipo de cambio correspondiente cuando es necesario presentar montos en moneda local.

### 7. FX-Service

Este servicio financiero, implementado en **TypeScript**, cumple uno de los requisitos explícitos del enunciado: consultar tipos de cambio para convertir el costo de los planes según la moneda del usuario. El diagrama muestra que se conecta a una **API externa de divisas** y utiliza **Redis Cache** con **TTL** para evitar consultas repetitivas, reduciendo latencia y dependencia directa de servicios externos. También mantiene una base de datos propia, **Divisas DB**, para soporte de configuraciones, histórico o persistencia complementaria.

### 8. Servicio de Notificaciones

Desarrollado en **TypeScript**, este microservicio administra el envío de correos electrónicos para confirmación de registro, recibos y alertas. Su comunicación con un servicio de **SMTP / Email** evidencia el cumplimiento del módulo de **Sistema de notificaciones por correo** definido en el enunciado.

## Comunicación entre componentes

Uno de los aspectos más importantes del diagrama es la interconexión interna por **gRPC**. Esta decisión es coherente con el requerimiento de mantener una comunicación sincrónica y directa entre servicios. Algunos flujos destacados son los siguientes:

- El **API Gateway** enruta solicitudes del frontend hacia los servicios internos según la operación solicitada.
- El servicio de **Streaming** consulta al servicio de **Catálogo** para obtener información del contenido reproducido.
- El flujo de reproducción también realiza una validación de plan por medio del servicio de **Suscripciones**, asegurando que el usuario tenga acceso al contenido solicitado.
- El servicio de **Cobros** consulta al **FX-Service** para convertir precios utilizando tipos de cambio actualizados.
- El servicio de **Notificaciones** puede activarse como parte de procesos de registro, compra o emisión de recibos.

Esta organización evita el acoplamiento directo entre cliente y backend interno, y distribuye la lógica de negocio en dominios especializados que colaboran entre sí por contratos bien definidos.

## Persistencia y patrón Database per Microservice

El diagrama cumple claramente con el patrón **Database per Microservice**, ya que cada servicio posee una base de datos independiente:

- `Usuarios DB`
- `Streaming DB`
- `Catalogo DB`
- `Calificaciones DB`
- `Suscripciones DB`
- `Cobros DB`
- `Divisas DB`

Esta separación permite que cada microservicio evolucione de manera autónoma, reduzca dependencias estructurales y mantenga mejor aislamiento de datos. También facilita la aplicación posterior de objetos programables de base de datos, tal como exige el enunciado, por ejemplo:

- **Procedimientos almacenados** para compras, activación de suscripciones o registro transaccional.
- **Vistas** para simplificar consultas del catálogo y fichas de contenido.
- **Funciones** para calcular porcentajes de recomendación o validaciones de negocio.
- **Triggers** para auditoría de cambios sensibles como credenciales o estado de membresías.

## Despliegue e infraestructura

El diagrama ubica la solución dentro de **Google Cloud Platform**, lo cual responde directamente al requerimiento de que la aplicación funcional esté desplegada en la nube usando dicha plataforma. Asimismo, cada microservicio aparece asociado a **Docker**, lo que indica que el sistema ha sido diseñado para ejecutarse mediante contenedores independientes. Esta decisión favorece la portabilidad, el aislamiento y la futura orquestación a través de **Docker Compose** tanto en entorno local como en entorno cloud.

La presencia de **Redis Cache** como componente separado también es relevante a nivel de despliegue, ya que representa una pieza de infraestructura transversal dedicada al rendimiento del servicio financiero. Del mismo modo, la integración con servicios externos como **SMTP/Email** y la **API de divisas** muestra que la arquitectura considera dependencias externas necesarias para cubrir las capacidades de negocio solicitadas.

## Relación con el enunciado del proyecto

Este diagrama satisface los principales puntos solicitados en el enunciado:

- Presenta un **API Gateway** como único punto de entrada.
- Modela la comunicación interna mediante **gRPC**.
- Distribuye los microservicios en **Python, Go y TypeScript**, cumpliendo el backend políglota.
- Incorpora un servicio de **autenticación**, un módulo de **suscripciones**, un **catálogo**, un sistema de **calificaciones**, un servicio de **streaming**, un módulo de **cobros**, un **FX-Service** y un sistema de **notificaciones**.
- Representa una capa de **Redis** con políticas de caché para divisas.
- Aplica el patrón **una base de datos por microservicio**.
- Muestra un despliegue pensado para **contenedores Docker** y para su ejecución en **Google Cloud Platform**.

## Conclusiones

La arquitectura propuesta para **Quetxal TV** responde de forma adecuada a los requerimientos funcionales y no funcionales planteados en el proyecto. El uso de microservicios desacoplados, comunicación sincrónica con **gRPC** y un **API Gateway** como núcleo de seguridad y enrutamiento permite construir una plataforma escalable, mantenible y preparada para crecimiento.

La separación por dominios de negocio y por bases de datos independientes fortalece la autonomía de cada servicio, facilita el mantenimiento y reduce el impacto de cambios futuros. A su vez, la adopción de **Docker**, **Redis** y **Google Cloud Platform** demuestra que la solución no solo cubre las funciones de negocio solicitadas, sino que también considera aspectos de despliegue, rendimiento e infraestructura exigidos por el enunciado.

En conclusión, el diagrama de arquitectura no solo representa la estructura técnica del sistema, sino que también evidencia el cumplimiento de las restricciones académicas del proyecto, especialmente en cuanto a seguridad, integración entre lenguajes, separación de responsabilidades y despliegue en la nube.
