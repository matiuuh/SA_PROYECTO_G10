# Toma y justificacion de decisiones

Este documento justifica las decisiones principales de tecnologia para el proyecto **Quetzal TV**, respondiendo las preguntas: **¿Que se eligio?**, **¿por que se eligio?** y **¿para que se eligio?**

El proyecto esta construido con una arquitectura de microservicios, separando responsabilidades por dominio: usuarios, suscripciones, catalogo, streaming, cobros, divisas y notificaciones. Cada servicio mantiene su propia logica, su propia base de datos y se comunica con otros servicios mediante contratos HTTP/gRPC.

## 1. Lenguaje de programacion

### ¿Que?

Se utilizaron varios lenguajes de programacion segun la necesidad de cada parte del sistema:

- **TypeScript** para el frontend y para servicios backend como `cobros`, `notificaciones` y `divisas`.
- **Python** para los servicios `usuario` y `suscripcion`.
- **Go** para los servicios `catalogo` y `streaming`.

### ¿Por que?

Se eligio una estrategia poliglota porque el proyecto esta basado en microservicios. Esto permite que cada servicio use el lenguaje que mejor se adapta a su responsabilidad.

**TypeScript** se utilizo porque permite trabajar con tipado estatico sobre JavaScript, reduciendo errores en tiempo de desarrollo. En el frontend facilita construir interfaces con React y en backend permite crear servicios de integracion con gRPC, PostgreSQL, correo y llamadas HTTP de forma ordenada.

**Python** se eligio para `usuario` y `suscripcion` porque permite desarrollar APIs rapidamente, tiene buena integracion con FastAPI, Pydantic, JWT, validaciones y conexion a PostgreSQL. Es adecuado para servicios con reglas de negocio claras como autenticacion, sesiones, perfiles, planes y suscripciones.

**Go** se eligio para `catalogo` y `streaming` porque ofrece buen rendimiento, binarios livianos, concurrencia nativa y una integracion fuerte con gRPC. Esto es util para servicios que pueden recibir muchas consultas, como busqueda de catalogo, detalles de contenido y progreso de reproduccion.

### ¿Para que?

La seleccion de lenguajes permite que el sistema sea modular, escalable y mantenible. Cada microservicio puede evolucionar de forma independiente, sin obligar a que todo el backend use una sola tecnologia.

Tambien facilita distribuir el trabajo del equipo, ya que cada grupo puede enfocarse en el lenguaje y estructura mas adecuada para su servicio:

- Python para servicios de negocio y autenticacion.
- Go para servicios de alto rendimiento y consulta.
- TypeScript para frontend, integraciones y servicios orientados a eventos o comunicacion externa.

## 2. Framework de desarrollo

## 2.1 Frontend

### ¿Que?

En el frontend se utilizo:

- **React** como libreria principal de interfaz.
- **Vite** como herramienta de desarrollo y construccion.
- **TypeScript** para tipado.
- **React Router** para navegacion.
- **Tailwind CSS** como soporte de estilos.

### ¿Por que?

React se eligio porque facilita construir interfaces basadas en componentes reutilizables. Esto es importante en una plataforma como Quetzal TV, donde se necesitan vistas como login, catalogo, perfiles, planes, pagos y paneles de usuario.

Vite se eligio porque ofrece un entorno de desarrollo rapido, recarga agil y un proceso de build simple. Esto mejora la productividad durante el desarrollo.

TypeScript ayuda a detectar errores antes de ejecutar la aplicacion, especialmente al consumir respuestas del backend o manejar estructuras como usuarios, planes, pagos y contenido.

React Router permite organizar la navegacion entre pantallas del sistema, y Tailwind CSS permite crear estilos de forma rapida y consistente.

### ¿Para que?

Estas herramientas permiten construir una interfaz web moderna, mantenible y facil de escalar. El frontend puede comunicarse con el API Gateway y consumir los servicios del backend sin depender directamente de la implementacion interna de cada microservicio.

La combinacion React + Vite + TypeScript ayuda a entregar una experiencia de usuario fluida y a mantener el codigo organizado por componentes.

## 2.2 Backend

### ¿Que?

En el backend se utilizaron distintos frameworks y herramientas segun el lenguaje:

- **FastAPI** en los servicios Python `usuario` y `suscripcion`.
- **gRPC** para comunicacion entre microservicios.
- **Node.js con TypeScript** para `cobros`, `notificaciones` y `divisas`.
- **Go con gRPC y net/http** para `catalogo` y `streaming`.
- **Docker Compose** para levantar el entorno local y preparar despliegues por contenedores.

### ¿Por que?

FastAPI se eligio porque permite crear APIs HTTP de forma rapida, con validacion automatica mediante Pydantic y soporte claro para dependencias, configuracion, autenticacion y documentacion.

gRPC se eligio porque permite definir contratos estrictos entre microservicios mediante archivos `.proto`. Esto reduce errores de integracion y facilita que servicios escritos en diferentes lenguajes se comuniquen de forma consistente.

Node.js con TypeScript se uso en servicios donde era necesario integrar comunicacion HTTP, gRPC, correo, conversion de divisas y procesamiento de pagos. TypeScript mejora la seguridad del codigo al trabajar con tipos para transacciones, recibos y notificaciones.

Go se uso en servicios donde se busca eficiencia y bajo consumo de recursos. Su integracion con gRPC permite crear servicios rapidos y faciles de desplegar como binarios dentro de contenedores.

Docker Compose se eligio porque permite levantar todo el ecosistema de microservicios, bases de datos y dependencias con comandos reproducibles.

### ¿Para que?

Estas herramientas permiten implementar una arquitectura de microservicios donde cada servicio tiene responsabilidades claras:

- `usuario`: autenticacion, cuentas, sesiones y perfiles.
- `suscripcion`: planes y suscripciones.
- `catalogo`: contenido, busqueda, generos, episodios y calificaciones.
- `streaming`: progreso e historial de reproduccion.
- `cobros`: pagos, transacciones y recibos.
- `notificaciones`: envio y registro de correos.
- `divisas`: conversion de monedas y cache.

El uso de gRPC, HTTP y Docker permite que el sistema sea integrable, desplegable y mantenible en entornos locales o en nube.

## 3. Sistema de bases de datos

### ¿Que?

Se utilizo **PostgreSQL** como sistema principal de base de datos relacional. Ademas, el proyecto contempla el uso de **Redis** como cache en el servicio de divisas.

La arquitectura aplica el patron **Database per Microservice**, por lo que cada microservicio posee su propia base de datos o esquema separado:

- `quetzal_usuario`
- `quetzal_suscripcion`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_cobros`
- `quetzal_notificaciones`

### ¿Por que?

PostgreSQL se eligio porque es un motor relacional robusto, estable y ampliamente usado en sistemas transaccionales. Permite manejar relaciones, restricciones, llaves foraneas, indices, tipos personalizados, procedimientos almacenados y transacciones.

Esto es importante para Quetzal TV porque el sistema maneja datos sensibles y estructurados, como cuentas de usuario, sesiones, perfiles, planes, suscripciones, pagos, recibos, contenido y progreso de reproduccion.

El patron **Database per Microservice** se eligio para evitar que los servicios compartan tablas directamente. Cada servicio es dueno de sus datos y se comunica con otros servicios usando identificadores y contratos, no accediendo a sus bases internas.

Redis se contempla para `divisas` porque las tasas de cambio pueden consultarse muchas veces y no siempre necesitan ir directamente a la API externa. Un cache reduce latencia y evita llamadas innecesarias.

### ¿Para que?

PostgreSQL permite garantizar integridad, consistencia y persistencia de la informacion principal del sistema. Por ejemplo:

- Usuarios conserva cuentas, sesiones y perfiles.
- Suscripcion conserva planes y suscripciones activas.
- Catalogo conserva peliculas, series, generos, episodios y calificaciones.
- Streaming conserva el historial y progreso de reproduccion.
- Cobros conserva transacciones y recibos.
- Notificaciones conserva el historial de correos enviados o fallidos.

La separacion de bases por microservicio permite escalar y desplegar servicios de forma independiente. Tambien reduce el acoplamiento: si un servicio cambia su estructura interna de datos, los demas no deben modificarse mientras se mantengan los contratos de comunicacion.

En despliegue local, PostgreSQL puede ejecutarse como contenedor. En nube, la documentacion del proyecto plantea usar instancias administradas como Cloud SQL por microservicio o contenedores PostgreSQL separados por servicio dentro de la red privada de GCP, manteniendo secretos fuera del repositorio mediante variables de entorno o Secret Manager.


## 4. Autenticacion y seguridad con JWT

### ¿Que?

Se utilizo **JWT (JSON Web Token)** como mecanismo principal para autenticar solicitudes protegidas. El servicio `usuario` genera el token al iniciar sesion o registrarse, y el **API Gateway** lo valida antes de permitir el acceso a rutas protegidas.

En el proyecto se configura mediante variables como:

- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_MINUTES`

### ¿Por que?

JWT se eligio porque encaja bien con una arquitectura de microservicios. En lugar de que cada servicio tenga que consultar constantemente la base de datos de usuarios para saber quien hace una peticion, el token transporta informacion firmada, como el identificador de cuenta, correo, rol y sesion.

Tambien permite que el **API Gateway** actue como primera capa de seguridad. En el codigo del gateway, las rutas publicas como login y registro no requieren token, pero las rutas protegidas validan el encabezado `Authorization: Bearer <token>` antes de reenviar la solicitud al microservicio correspondiente.

Esto reduce acoplamiento porque los microservicios no necesitan compartir tablas de sesiones o usuarios. Solo necesitan confiar en un token firmado con el mismo secreto configurado.

### ¿Para que?

JWT se usa para:

- Proteger rutas privadas del sistema.
- Propagar identidad del usuario entre frontend, API Gateway y servicios internos.
- Diferenciar acciones de usuarios y administradores mediante claims como `role`.
- Evitar que el cliente acceda directamente a microservicios internos.
- Mantener una autenticacion compatible con HTTP y con una arquitectura distribuida.

Con esta decision, el sistema puede validar usuarios de forma centralizada y mantener los microservicios desacoplados.


## 5. Docker y Docker Compose

### ¿Que?

Se utilizo **Docker** para contenerizar el frontend, el API Gateway, los microservicios y las bases de datos. Se uso **Docker Compose** para levantar el entorno completo en local y para organizar despliegues en nube por VM.

El proyecto maneja archivos como:

- `docker-compose.local.yml` para desarrollo local.
- `docker-compose.cloud-vm1.yml`, `docker-compose.cloud-vm2.yml`, `docker-compose.cloud-vm3.yml` y `docker-compose.cloud-vm4.yml` para despliegue distribuido en GCP.
- `Dockerfile` por servicio para definir como construir cada contenedor.

### ¿Por que?

Docker se eligio porque cada microservicio usa tecnologias distintas: Python, Go, TypeScript, PostgreSQL, Redis y Nginx. Si se instalaran todas directamente en una maquina, el entorno seria dificil de replicar y propenso a errores de configuracion.

Con Docker, cada servicio viaja con sus dependencias, version de runtime y configuracion base. Esto ayuda a que el sistema se ejecute igual en diferentes computadoras o servidores.

Docker Compose se eligio porque simplifica la ejecucion de varios contenedores relacionados. En una arquitectura de microservicios no se levanta solo una aplicacion, sino varios servicios, bases de datos, gateway, cache y frontend.

### ¿Para que?

Docker y Docker Compose sirven para:

- Ejecutar el proyecto completo con comandos reproducibles.
- Aislar dependencias por servicio.
- Evitar conflictos entre versiones de Python, Node.js, Go o PostgreSQL.
- Facilitar el despliegue en GCP usando los mismos contenedores.
- Separar el entorno local del entorno de produccion mediante archivos Compose distintos.
- Definir variables de entorno, puertos, volumenes y redes de forma declarativa.

Ademas, los Dockerfiles de servicios Go usan un contexto de build basado en `backend/` porque necesitan acceder tanto al codigo del servicio como a los contratos `proto/`.


## 6. Despliegue en Google Cloud Platform (GCP)

### ¿Que?

Se decidio desplegar la solucion en **Google Cloud Platform (GCP)** usando maquinas virtuales y contenedores Docker. La documentacion del proyecto plantea una separacion por responsabilidades:

- VM para servicios principales.
- VM para servicios complementarios.
- VM para bases de datos.
- VM publica para frontend y API Gateway.

En el despliegue cloud, el **API Gateway** es el unico punto de entrada publico. Los microservicios y bases de datos quedan comunicados por IPs internas dentro de la red de GCP.

### ¿Por que?

GCP se eligio porque permite desplegar una arquitectura distribuida de forma realista, usando recursos de nube y separacion de red. Para un proyecto de microservicios, no basta con ejecutar todo localmente; es importante demostrar que la solucion puede operar en un ambiente similar a produccion.

La separacion en VMs permite organizar la carga:

- El frontend y API Gateway concentran el trafico externo.
- Los microservicios quedan detras del gateway.
- Las bases de datos se mantienen aisladas y accesibles solo desde la red interna.

Tambien se justifica porque GCP ofrece servicios que pueden fortalecer la arquitectura:

- **Compute Engine** para ejecutar VMs con Docker.
- **Cloud SQL** como alternativa administrada para PostgreSQL.
- **Artifact Registry** para almacenar imagenes Docker preconstruidas.
- **Secret Manager** para manejar secretos sin guardarlos en el repositorio.
- **VPC y reglas de firewall** para restringir acceso a servicios internos.

### ¿Para que?

GCP se usa para demostrar que Quetzal TV puede ejecutarse fuera del ambiente local y cumplir con un despliegue en nube. Esto permite:

- Publicar el frontend y API Gateway en una direccion accesible.
- Mantener los microservicios protegidos dentro de la red privada.
- Restringir los puertos de bases de datos para que no esten expuestos a internet.
- Separar secretos de configuracion del codigo fuente.
- Escalar servicios de forma independiente si aumenta la demanda.
- Preparar una futura migracion hacia servicios administrados como Cloud SQL o Artifact Registry.

La decision tambien ayuda a cumplir el criterio de una arquitectura preparada para produccion, con separacion entre entorno local y entorno cloud.


## 7. Comunicacion interna con gRPC

### ¿Que?

Se eligio **gRPC** para la comunicacion interna entre microservicios. Los contratos se definen mediante archivos `.proto`, ubicados en `backend/proto/<servicio>/v1/`.

### ¿Por que?

gRPC se eligio porque permite crear contratos estrictos entre servicios escritos en diferentes lenguajes. En Quetzal TV hay servicios en Python, Go y TypeScript, por lo que era necesario un mecanismo de comunicacion independiente del lenguaje.

Al definir mensajes y operaciones en `.proto`, cada servicio sabe exactamente que datos debe enviar y recibir. Esto evita errores comunes de integracion y facilita generar codigo cliente/servidor.

Tambien es mas eficiente que usar solo JSON/REST para llamadas internas frecuentes, especialmente en servicios que pueden tener consultas recurrentes como catalogo, streaming, suscripcion o pagos.

### ¿Para que?

gRPC se usa para:

- Comunicar microservicios de forma tipada.
- Mantener contratos claros entre equipos.
- Evitar dependencia directa entre bases de datos.
- Permitir que servicios escritos en distintos lenguajes colaboren.
- Separar la comunicacion interna del API publico consumido por el frontend.

Con esta decision, el sistema mantiene una integracion ordenada entre microservicios sin compartir logica de negocio ni tablas.

[Volver a Documentación](../Documentación.md)


# Redis

## ¿Qué?

Se utilizó **Redis** como sistema de caché principalmente en el microservicio `divisas`.

Redis es una base de datos en memoria extremadamente rápida, diseñada para almacenar datos temporales como sesiones, tokens, resultados frecuentes o información que cambia constantemente.

En Quetzal TV, Redis se contempla para guardar temporalmente las tasas de cambio obtenidas desde APIs externas de divisas.

---

## ¿Por qué?

Redis se eligió porque las conversiones de moneda pueden ser consultadas muchas veces en poco tiempo y no es eficiente hacer solicitudes repetidas a una API externa cada vez que un usuario consulta precios o realiza pagos.

Al trabajar en memoria:

* Las respuestas son mucho más rápidas.
* Se reduce la latencia del sistema.
* Se disminuye la carga sobre APIs externas.
* Se evitan límites de consumo o bloqueos del proveedor de divisas.
* Se mejora el rendimiento general del microservicio.

Además, Redis encaja muy bien en arquitecturas de microservicios porque funciona como un componente desacoplado y ligero.

En la estructura del proyecto también se especifica que Redis solo debe utilizarse donde realmente sea necesario, como en `divisas`.

---

## ¿Para qué?

Redis se utiliza para:

* Guardar temporalmente tasas de cambio de monedas.
* Evitar consultas repetitivas hacia APIs externas.
* Mejorar tiempos de respuesta en conversiones monetarias.
* Reducir costos y consumo de servicios externos.
* Mantener información temporal de acceso frecuente.

Por ejemplo:

1. El servicio `divisas` consulta una tasa USD → GTQ.
2. Guarda el resultado en Redis durante cierto tiempo (TTL).
3. Las siguientes solicitudes reutilizan el valor almacenado.
4. Cuando expira el tiempo, el servicio vuelve a consultar la API externa y actualiza el caché.

Esto permite que Quetzal TV tenga conversiones de moneda rápidas y eficientes sin depender constantemente de servicios externos.



# Despliegue en la nube con 4 VMs

## ¿Qué?

Se implementó una arquitectura distribuida utilizando **4 máquinas virtuales (VMs)** en Google Cloud Platform (GCP).

Cada VM fue diseñada para cumplir responsabilidades específicas dentro del sistema:

* **VM1:** servicios principales (`usuario`, `suscripcion`, `catalogo`)
* **VM2:** servicios complementarios (`divisas`, `cobros`, `notificaciones`, `streaming`, `Redis`)
* **VM3:** bases de datos PostgreSQL
* **VM4:** API Gateway y frontend React

La comunicación entre VMs se realiza mediante una red privada interna de GCP.

---

## ¿Por qué?

Se eligió una distribución en múltiples VMs para evitar concentrar todo el sistema en un único servidor, lo cual podría generar cuellos de botella, problemas de seguridad y mayor impacto ante fallos.

La separación por responsabilidades permite:

* Mejor organización de la infraestructura.
* Aislamiento entre servicios.
* Mayor seguridad en la red.
* Escalabilidad independiente por componente.
* Mejor control del tráfico interno y externo.

También se decidió mantener únicamente el API Gateway y el frontend expuestos públicamente, mientras que los microservicios y bases de datos permanecen dentro de la red privada de GCP.

Además, esta arquitectura se aproxima más a un entorno real de producción basado en microservicios distribuidos.

---

## ¿Para qué?

La separación en 4 VMs se utiliza para:

* Distribuir la carga del sistema.
* Proteger servicios internos y bases de datos.
* Permitir despliegues independientes.
* Facilitar mantenimiento y monitoreo.
* Reducir el impacto de fallos en un solo componente.
* Mantener comunicación privada entre microservicios mediante VPC interna.
* Exponer únicamente el API Gateway al internet público.

Esta arquitectura permite que Quetzal TV tenga una infraestructura más organizada, segura y preparada para escalar en un entorno cloud real.


[Volver a Documentación](../Documentación.md)