# Toma y Justificación de Decisiones

Este documento describe las decisiones tecnológicas de **Quetzal TV** respondiendo, para
cada categoría solicitada, las preguntas **¿qué se utilizó?**, **¿por qué se eligió?** y
**¿para qué se utiliza?**. La información corresponde a la implementación actual del
repositorio.

## 1. Lenguajes de programación utilizados

### ¿Qué?

Se utiliza un enfoque políglota con tres lenguajes principales:

- **Python:** microservicios de Usuarios y Suscripción.
- **Go:** microservicios de Catálogo y Streaming.
- **TypeScript:** frontend, API Gateway y microservicios de Cobros, Divisas y
  Notificaciones.

### ¿Por qué?

La arquitectura de microservicios permite seleccionar el lenguaje más adecuado para cada
dominio:

- **Usuarios — Python:** se eligió porque este servicio concentra autenticación,
  validación de credenciales, sesiones y administración de perfiles. Python, junto con
  FastAPI y Pydantic, permite implementar y validar rápidamente estas reglas de negocio.
  Su ecosistema de seguridad facilita trabajar con JWT, hashing de contraseñas y modelos
  de entrada tipados.

- **Suscripción — Python:** administra planes, estados de suscripción y cambios de plan,
  operaciones que contienen numerosas validaciones y reglas de negocio. Python permite
  expresar estas reglas de forma clara y mantener una estructura legible, mientras
  FastAPI facilita exponerlas mediante HTTP y gRPC.

- **Catálogo — Go:** el catálogo debe responder búsquedas, filtros, detalles, temporadas,
  episodios y operaciones administrativas. Go ofrece ejecución rápida, bajo consumo de
  memoria y concurrencia eficiente, características apropiadas para un servicio con gran
  cantidad de solicitudes de lectura. Su tipado estático también ayuda a mantener
  consistentes los modelos del contenido.

- **Streaming — Go:** gestiona historial de reproducción, progreso y generación de URLs
  para videos. Se eligió Go por su rendimiento, tiempos de respuesta predecibles y buen
  manejo de operaciones concurrentes. También produce binarios pequeños, convenientes
  para construir imágenes Docker ligeras y ejecutar múltiples instancias.

- **Cobros — TypeScript:** procesa transacciones, recibos y comunicación con Divisas y
  Notificaciones. TypeScript permite modelar montos, estados y respuestas con tipos
  explícitos, reduciendo errores asociados con datos financieros. Node.js resulta
  adecuado para coordinar varias operaciones de red y llamadas gRPC.

- **Divisas — TypeScript:** integra una API externa, PostgreSQL y Redis. Este servicio
  realiza principalmente operaciones de entrada/salida, por lo que el modelo asíncrono de
  Node.js permite esperar respuestas HTTP o accesos a caché sin bloquear el proceso.
  TypeScript define claramente las monedas, tasas y resultados de conversión.

- **Notificaciones — TypeScript:** se conecta con un proveedor SMTP y recibe solicitudes
  gRPC desde otros servicios. Node.js dispone de librerías maduras como Nodemailer y es
  apropiado para tareas de red. TypeScript ayuda a validar las distintas estructuras de
  correos, recibos y alertas.

- **API Gateway — TypeScript:** concentra validación JWT, reglas de rutas y proxy HTTP.
  Se eligió TypeScript porque permite definir de forma segura los destinos y la
  configuración del gateway. El modelo asíncrono de Node.js es adecuado para reenviar
  numerosas solicitudes de red con poca lógica computacional.

- **Frontend — TypeScript:** la interfaz maneja cuentas, perfiles, planes, contenido,
  pagos y respuestas de múltiples APIs. El tipado permite detectar durante la compilación
  inconsistencias entre los datos esperados y los datos recibidos, mejorando la
  mantenibilidad de los componentes React.

El uso combinado de los tres lenguajes también satisface el requisito de construir un
backend políglota sin perder interoperabilidad, debido a que la comunicación se define
mediante contratos Protocol Buffers.

### ¿Para qué?

Esta distribución permite que cada microservicio evolucione y se despliegue de forma
independiente. También ayuda a separar responsabilidades, reducir el acoplamiento y
aprovechar las fortalezas particulares de cada lenguaje.

## 2. Frameworks y herramientas de desarrollo

### ¿Qué?

Las principales herramientas utilizadas son:

- **React:** construcción de la interfaz web.
- **Vite:** servidor de desarrollo y empaquetado del frontend.
- **React Router:** navegación entre vistas públicas, privadas y administrativas.
- **Tailwind CSS:** estilos y diseño visual del frontend.
- **FastAPI:** APIs HTTP de los servicios Python.
- **Pydantic:** validación y configuración en los servicios Python.
- **Node.js:** entorno de ejecución del API Gateway y servicios TypeScript.
- **API HTTP nativa de Node.js:** implementación del API Gateway, sin Express o NestJS.
- **net/http:** endpoints HTTP de Catálogo y Streaming en Go.
- **gRPC y Protocol Buffers:** comunicación tipada entre microservicios.
- **Docker y Docker Compose:** construcción y ejecución reproducible de contenedores.
- **Kubernetes:** orquestación del entorno de `release`.

### ¿Por qué?

React permite dividir la interfaz en componentes reutilizables. Vite reduce el tiempo de
compilación durante el desarrollo y genera los archivos optimizados del frontend.
FastAPI y Pydantic permiten crear APIs tipadas y validar solicitudes con poco código
repetitivo.

El API Gateway utiliza las librerías HTTP nativas de Node.js porque sus responsabilidades
principales son validar JWT, reescribir rutas y actuar como proxy, sin requerir un
framework web adicional. Los servicios Go también utilizan herramientas estándar junto
con gRPC para conservar una implementación ligera.

Docker normaliza los entornos de Python, Go, Node.js, PostgreSQL y Redis. Kubernetes se
utiliza en `release` para administrar pods, servicios, recursos, sondas de salud,
actualizaciones progresivas y recuperación automática.

### ¿Para qué?

Estas herramientas permiten construir, probar y desplegar la plataforma con componentes
modulares. El frontend consume un único API Gateway; los microservicios mantienen
contratos claros; y los mismos artefactos Docker pueden ejecutarse en Compute Engine o
GKE.

## 3. Mapeo de lenguajes y frameworks

| Componente | Lenguaje | Frameworks o librerías principales | Responsabilidad |
| --- | --- | --- | --- |
| Frontend | TypeScript | React, Vite, React Router, Tailwind CSS | Interfaces de usuario y administración |
| API Gateway | TypeScript | Node.js HTTP, `jsonwebtoken` | Punto de entrada, validación JWT y proxy |
| Usuarios | Python | FastAPI, Pydantic, PyJWT, gRPC, psycopg | Cuentas, autenticación, sesiones y perfiles |
| Suscripción | Python | FastAPI, Pydantic, PyJWT, gRPC, psycopg | Planes, suscripciones y cambios de plan |
| Catálogo | Go | gRPC, `net/http`, pgx, Google Cloud Storage SDK | Catálogo, calificaciones, CRUD y archivos multimedia |
| Streaming | Go | gRPC, `net/http`, pgx, Google Cloud Storage SDK | Historial, progreso y URLs de reproducción |
| Cobros | TypeScript | Node.js, gRPC, PostgreSQL `pg` | Transacciones, pagos y recibos |
| Divisas | TypeScript | Node.js, gRPC, Axios, PostgreSQL `pg`, Redis | Tasas de cambio y caché con TTL |
| Notificaciones | TypeScript | Node.js, gRPC, Nodemailer, PostgreSQL `pg` | Correos y registro de notificaciones |

### ¿Por qué?

El mapeo asigna Python a servicios con validaciones y reglas de cuenta; Go a dominios que
gestionan consultas y recursos multimedia; y TypeScript a la capa de presentación,
enrutamiento e integraciones.

### ¿Para qué?

La matriz documenta con precisión dónde se utiliza cada tecnología y permite demostrar
que la distribución políglota no es arbitraria, sino que responde a las responsabilidades
de cada componente.

## 4. Herramienta de automatización CI/CD

### ¿Qué?

Se utiliza **GitHub Actions** mediante tres workflows:

- `ci.yml`: pruebas unitarias y cobertura.
- `cd-develop.yml`: construcción y despliegue de `develop` en Compute Engine.
- `cd-release.yml`: versionamiento semántico y despliegue de `release` en GKE.

El pipeline utiliza además Docker Buildx, Google Artifact Registry, GCS, SSH y `kubectl`.

### ¿Por qué?

GitHub Actions se integra directamente con el repositorio, Pull Requests, ramas y
secretos. Permite ejecutar pruebas de Python, Go y TypeScript en jobs independientes y
aplicar una puerta de calidad con cobertura mínima del **75 %**.

También centraliza el proceso de construcción y despliegue, evitando que cada integrante
publique imágenes o modifique manualmente la infraestructura con configuraciones
diferentes.

### ¿Para qué?

El pipeline automatiza:

1. Descarga del código.
2. Instalación de dependencias.
3. Pruebas unitarias y validación de cobertura.
4. Backup de las siete bases PostgreSQL hacia GCS.
5. Construcción de nueve imágenes Docker.
6. Publicación en Artifact Registry.
7. Despliegue de `develop` en cuatro VMs de Compute Engine.
8. Creación de tags `v2.x.0` y despliegue de `release` en GKE.
9. Verificación del rollout y rollback automático en Kubernetes.

Docker Hub no funciona como registro del proyecto. Solo se autentica durante el build
para evitar límites al descargar imágenes base. Las imágenes propias se almacenan en
**Artifact Registry**.

> **Observación técnica:** los workflows actuales de CD se disparan directamente con el
> `push` a `develop` o `release`. Para garantizar completamente el cortocircuito exigido,
> deben condicionarse al resultado exitoso del workflow de CI o proteger las ramas para
> impedir el merge cuando falle la puerta de calidad.

## 5. Ecosistema de base de datos

### ¿Qué?

Se utiliza **PostgreSQL** como base de datos relacional y **Redis** como caché. La
arquitectura aplica el patrón **Database per Microservice** con siete bases:

- `quetzal_usuario`
- `quetzal_suscripcion`
- `quetzal_catalogo`
- `quetzal_streaming`
- `quetzal_cobros`
- `quetzal_divisas`
- `quetzal_notificaciones`

Cada base PostgreSQL contiene triggers y una tabla propia de auditoría. Redis se utiliza
únicamente como caché del servicio de Divisas y se excluye de los backups.

### ¿Por qué?

PostgreSQL proporciona transacciones, integridad referencial, índices, funciones,
procedimientos, vistas y triggers. Estas capacidades son necesarias para cuentas,
suscripciones, pagos, contenido, historial y auditoría.

El patrón Database per Microservice evita que un servicio modifique directamente las
tablas de otro. Redis se eligió porque las tasas de cambio son consultadas repetidamente y
pueden conservarse temporalmente mediante TTL.

### ¿Para qué?

PostgreSQL mantiene la información operacional y registra los cambios de `INSERT`,
`UPDATE` y `DELETE` en tablas de auditoría. Redis reduce la latencia y el consumo del
proveedor externo de divisas.

En ambos entornos cloud, las bases PostgreSQL se ejecutan en contenedores dentro de una VM
de Compute Engine. GitHub Actions ejecuta `pg_dump` sobre las siete bases y guarda los
respaldos comprimidos en un bucket privado de GCS.

## 6. Servicios de nube utilizados

### ¿Qué?

La plataforma utiliza los siguientes servicios de **Google Cloud Platform**:

- **Compute Engine:** cuatro VMs para el entorno `develop` y una VM para las bases de
  datos utilizadas por `release`.
- **Google Kubernetes Engine:** clúster Kubernetes para la rama `release`.
- **Artifact Registry:** registro privado de imágenes Docker.
- **Google Cloud Storage:** bucket multimedia y bucket de backups.
- **VPC y reglas de firewall:** comunicación privada y restricción de puertos.
- **Service Accounts / Workload Identity:** acceso de los servicios a recursos de GCP.
- **Ingress de GKE:** único acceso externo al clúster.

### ¿Por qué?

GCP es el proveedor obligatorio del proyecto y ofrece los servicios necesarios para
ejecutar los dos entornos. Compute Engine permite demostrar un despliegue distribuido
basado en VMs y Docker Compose. GKE añade orquestación, descubrimiento interno,
RollingUpdate, probes y rollback.

Artifact Registry mantiene las imágenes privadas y versionadas. GCS desacopla los videos
y portadas del sistema de archivos de los contenedores y conserva respaldos fuera de la
VM de bases de datos.

### ¿Para qué?

- `develop` se despliega en Compute Engine con imágenes `develop-SHA`.
- `release` se despliega en GKE con tags semánticos `v2.x.0`.
- Artifact Registry distribuye las mismas imágenes verificadas a ambos entornos.
- El bucket multimedia almacena portadas, trailers y episodios.
- El bucket de backups protege las copias de las bases operacionales.
- La VPC evita exponer directamente microservicios y PostgreSQL.
- Ingress concentra el tráfico público hacia frontend y API Gateway.

## 7. Seguridad: autenticación y autorización

### ¿Qué?

La implementación utiliza:

- **JWT firmado con HS256** para autenticación.
- Encabezado `Authorization: Bearer <token>` para solicitudes protegidas.
- **API Gateway** como punto central de validación para rutas externas.
- Claims como `sub`, `role` y `session_id`.
- Control de acceso por roles para diferenciar usuarios y administradores.
- Hash de contraseñas antes de almacenarlas.
- Variables de entorno, GitHub Secrets y Kubernetes Secrets para datos sensibles.
- ConfigMaps para configuración no sensible.
- URLs firmadas de GCS para cargar o consumir archivos.
- Red privada y reglas de firewall para los servicios internos.

### ¿Por qué?

JWT permite propagar identidad entre componentes sin compartir directamente las tablas de
Usuarios. La firma evita que el cliente modifique los claims y el rol permite aplicar
autorización sobre operaciones administrativas.

El API Gateway reduce la superficie pública porque actúa como punto único de entrada.
Separar configuración y secretos evita almacenar contraseñas, llaves JWT y credenciales
en el código o en los manifiestos versionados.

Las URLs firmadas permiten acceder temporalmente a objetos privados de GCS sin hacer
público el bucket ni compartir credenciales con el navegador.

### ¿Para qué?

Estos mecanismos sirven para:

- autenticar al usuario;
- proteger las rutas privadas;
- permitir acciones administrativas únicamente al rol autorizado;
- propagar la identidad hacia los servicios;
- proteger credenciales de PostgreSQL, SMTP, JWT y GCS;
- evitar acceso público directo a microservicios y bases de datos;
- limitar temporalmente el acceso a videos, portadas y cargas multimedia.

Actualmente la aplicación utiliza JWT Bearer como mecanismo implementado. No se encontró
un flujo OAuth ni una sesión basada en cookies `HttpOnly`; por tanto, no se documentan
como mecanismos activos.

## 8. GitHub Actions — Automatización CI/CD

### ¿Qué?

Se utiliza **GitHub Actions** como herramienta de automatización para el pipeline de
Integración y Despliegue Continuo. La configuración se encuentra versionada en
`.github/workflows/` y se divide en:

- `ci.yml`: ejecuta las pruebas unitarias de los ocho componentes backend y valida una
  cobertura mínima del 75 %.
- `cd-develop.yml`: construye las nueve imágenes y despliega la rama `develop` en las
  VMs de Compute Engine.
- `cd-release.yml`: genera el tag semántico, construye las imágenes, realiza el backup,
  despliega en GKE y ejecuta rollback cuando el rollout falla.

### ¿Por qué?

Se eligió porque el código ya se administra en GitHub y la automatización puede mantenerse
en el mismo repositorio mediante archivos YAML. Esto permite revisar los cambios del
pipeline mediante Pull Requests y evita depender de un servidor de integración externo.

GitHub Actions también dispone de acciones oficiales para autenticarse con Google Cloud,
configurar Docker, obtener credenciales de GKE y publicar artefactos de cobertura.

### ¿Para qué?

GitHub Actions automatiza las pruebas, la validación de cobertura, los backups, la
construcción y publicación de imágenes y el despliegue de los dos entornos. También
centraliza el uso de secretos para evitar que las credenciales de GCP, PostgreSQL, SMTP y
SSH se almacenen en el repositorio.

## 9. Kubernetes y Google Kubernetes Engine

### ¿Qué?

Se utiliza **Google Kubernetes Engine (GKE)** para orquestar el entorno de la rama
`release`. Los recursos se despliegan dentro del namespace `quetzaltv-prod` mediante
manifiestos YAML almacenados en `k8s/`.

El clúster ejecuta diez componentes propios de la aplicación:

- frontend;
- API Gateway;
- siete microservicios;
- Redis.

Las bases PostgreSQL permanecen fuera del clúster, en una VM de Compute Engine.
Además, el clúster aloja los componentes de centralización de logs y monitoreo descritos
en las secciones 18 y 19.

### ¿Por qué?

Kubernetes proporciona capacidades que Docker Compose no ofrece por sí solo:

- actualización progresiva mediante `RollingUpdate`;
- recuperación de contenedores;
- sondas `liveness` y `readiness`;
- servicios internos para descubrimiento;
- aislamiento mediante namespaces;
- límites y solicitudes de CPU y memoria;
- configuración declarativa versionada.

Todos los Deployments están configurados con `maxUnavailable: 0` y `maxSurge: 1`, de
modo que se crea una instancia nueva antes de retirar la anterior. No se afirma que el
clúster use modalidad Autopilot porque esa configuración no está registrada en el
repositorio.

### ¿Para qué?

GKE se utiliza para ejecutar la versión de `release` con actualizaciones sin interrupción,
supervisar la salud de los pods y restaurar la versión anterior cuando el rollout falla.
El recurso Ingress constituye el único acceso externo y dirige el tráfico al API Gateway,
sin exponer individualmente los microservicios.

La justificación de Deployments, Services, ConfigMaps, Secrets, recursos, sondas,
RollingUpdate y rollback se amplía en
[Justificación de Kubernetes](./Justificación_Kubernetes.md).

## 10. Google Artifact Registry

### ¿Qué?

Se utiliza **Google Artifact Registry** como registro privado para las nueve imágenes
Docker del proyecto. El repositorio se denomina `quetzaltv` y su dirección se construye
durante el pipeline con:

```text
<región>-docker.pkg.dev/<proyecto-gcp>/quetzaltv/<servicio>:<versión>
```

En `develop` se utilizan tags `develop-<SHA>` y en `release` tags semánticos `v2.x.0`.

### ¿Por qué?

Artifact Registry se integra de forma nativa con Compute Engine, GKE y las cuentas de
servicio de Google Cloud. Permite mantener las imágenes privadas, versionadas y cercanas
a la infraestructura que las consume.

También evita utilizar Docker Hub como registro de las imágenes propias. Docker Hub se
consulta únicamente para descargar imágenes base durante la construcción.

### ¿Para qué?

Artifact Registry almacena las imágenes producidas por GitHub Actions y funciona como
fuente para los despliegues de Compute Engine y GKE. Los tags inmutables permiten
identificar qué versión se ejecuta y recuperar imágenes anteriores durante un rollback.

## 11. Google Cloud Storage

### ¿Qué?

Se utiliza **Google Cloud Storage (GCS)** mediante dos propósitos separados:

- bucket multimedia `quetzal-tv-streaming`, para portadas, trailers y videos de
  episodios;
- bucket privado de backups, cuyo nombre se configura mediante el secreto
  `GCS_BACKUP_BUCKET`.

Catálogo y Streaming utilizan el SDK de Cloud Storage y URLs firmadas. El pipeline utiliza
`gsutil` para almacenar los respaldos comprimidos.

### ¿Por qué?

Los contenedores y pods son reemplazables, por lo que su sistema de archivos no es
adecuado para conservar archivos multimedia. GCS desacopla esos objetos del ciclo de vida
de la aplicación y permite que varias instancias consulten la misma fuente persistente.

Las URLs firmadas permiten transferir archivos directamente entre el navegador y GCS
durante un periodo limitado, sin hacer público el bucket ni enviar todo el contenido
binario a través del microservicio.

El bucket de backups mantiene las copias fuera de la VM que aloja PostgreSQL, reduciendo
el riesgo de perder simultáneamente la base operacional y su respaldo.

### ¿Para qué?

GCS se utiliza para:

- almacenar portadas, trailers y episodios;
- generar URLs firmadas de carga para administradores;
- generar URLs temporales de lectura para el reproductor;
- conservar los `pg_dump` de las siete bases PostgreSQL;
- mantener disponibles los archivos aunque los contenedores o pods sean reemplazados.

## 12. Descarga simulada exclusiva para el Plan Premium

### ¿Qué?

Se implementó un módulo de descarga simulada disponible únicamente para usuarios con un
Plan Premium activo. En lugar de descargar el archivo completo del video, el navegador
guarda localmente y de forma cifrada los datos que identifican la película o el episodio.

La solución utiliza:

- **IndexedDB** como almacenamiento persistente del navegador;
- **Web Crypto API** para las operaciones criptográficas;
- **AES-GCM de 256 bits** para cifrar y autenticar cada registro;
- una **clave criptográfica no extraíble**, conservada por el navegador;
- el permiso `puede_descargar`, calculado por el servicio de Suscripción;
- la pantalla privada `/downloads` para consultar, abrir y eliminar descargas.

No se utilizan Service Workers porque el requisito permite elegir entre almacenamiento
cifrado del navegador o Service Workers. La implementación selecciona la primera
alternativa.

### ¿Por qué?

IndexedDB fue elegido porque está diseñado para almacenar datos estructurados en el
navegador, admite operaciones asíncronas y ofrece mayor capacidad y organización que
`localStorage`. El cifrado AES-GCM protege la confidencialidad e integridad de los
registros locales, mientras que un vector de inicialización aleatorio evita que dos
descargas iguales produzcan el mismo contenido cifrado.

Se optó por una descarga simulada porque satisface el alcance académico sin duplicar
archivos multimedia grandes en el dispositivo ni introducir la complejidad de
segmentación, caché, expiración y reproducción offline de video. Tampoco se almacenan
URLs firmadas de GCS, ya que son temporales y podrían expirar. Al abrir una descarga, la
aplicación navega al contenido original y solicita una URL vigente.

La restricción se calcula en el backend para que la interfaz no deduzca el beneficio a
partir del precio o del número de perfiles. El servicio de Suscripción verifica que exista
una suscripción activa cuyo plan normalizado sea `Premium` y responde:

- `puede_descargar: true` para Premium;
- `puede_descargar: false` para Básico, Estándar, suscripción cancelada o inexistente.

El frontend vuelve a validar este permiso antes de mostrar la biblioteca. Si el usuario
cambia a un plan inferior, los registros permanecen cifrados en el dispositivo, pero no
pueden consultarse ni abrirse hasta recuperar Premium.

### ¿Para qué?

Esta decisión permite:

- cumplir la segmentación normativa de la descarga como beneficio exclusivo de Premium;
- demostrar persistencia local cifrada sin almacenar el video completo;
- separar las descargas por cuenta, perfil, contenido y episodio;
- impedir que perfiles diferentes mezclen sus bibliotecas locales;
- permitir guardar, detectar duplicados, listar y eliminar registros;
- mantener la autorización en el dominio responsable de los planes;
- evitar tablas de descargas o archivos multimedia duplicados en el backend.

La implementación completa y su procedimiento de verificación se describen en
[Descarga de contenido Premium](../Descarga_Contenido_Premium.md).

## 13. Algoritmo de recomendaciones basado en contenido

### ¿Qué?

Se implementó un motor de recomendaciones personalizadas basado en contenido. El
algoritmo construye un perfil de gustos para cada perfil de usuario a partir de:

- los últimos 25 registros del historial de reproducción;
- la recencia de cada reproducción;
- el estado `en_progreso` o `finalizado`;
- las reacciones `like` y `dislike`;
- los géneros asociados a películas y series;
- el porcentaje global de recomendación de cada contenido.

El motor asigna un peso a cada género y calcula el puntaje de un candidato mediante:

\[
score(c) =
\frac{P(c)}{100}
+ 2\sum_{g \in G(c)} W(g)
\]

Donde \(P(c)\) es la recomendación global, \(G(c)\) representa los géneros del contenido
y \(W(g)\) es la preferencia acumulada del perfil por cada género.

El servicio excluye el contenido que ya aparece en el historial, ordena los candidatos
por puntaje y utiliza la popularidad global como desempate. Cuando el perfil no tiene
historial ni calificaciones, aplica un arranque en frío basado únicamente en popularidad.

### ¿Por qué?

Se eligió el filtrado basado en contenido porque puede operar con los datos que la
plataforma ya administra y no requiere una gran comunidad de usuarios para producir
resultados. Un algoritmo colaborativo necesitaría una matriz amplia de interacciones
entre usuarios y contenidos; durante las primeras etapas del sistema esa matriz sería
escasa y produciría recomendaciones poco confiables.

La solución seleccionada también es explicable. Además del puntaje, cada resultado puede
indicar un motivo como `"Porque viste contenido de Acción"` o
`"Popular en el catálogo"`. Esto facilita demostrar y validar el comportamiento del
algoritmo.

Los pesos favorecen señales de mayor intención:

- el contenido reciente aporta más que el antiguo;
- finalizar una reproducción incrementa la afinidad;
- un `like` aumenta el peso de sus géneros;
- un `dislike` reduce la afinidad;
- el porcentaje comunitario evita ignorar la popularidad general.

Se trata de una adaptación académica inspirada en técnicas empleadas por plataformas como
Netflix, no de una reproducción de su algoritmo propietario.

### ¿Para qué?

Esta decisión permite:

- mostrar la sección **“Recomendados para ti”** en el panel;
- generar resultados distintos para cada perfil de una misma cuenta;
- aprovechar historial y calificaciones ya existentes;
- evitar recomendar nuevamente contenido reproducido;
- ofrecer recomendaciones aun cuando el perfil sea nuevo;
- explicar al usuario la razón principal de cada sugerencia;
- evolucionar posteriormente hacia un modelo híbrido sin modificar el frontend.

### Justificación arquitectónica

El cálculo pertenece al servicio **Streaming** porque este administra el historial y
orquesta el caso de uso. El servicio **Catálogo** conserva la propiedad de contenidos,
géneros y calificaciones, y los proporciona mediante HTTP. El frontend únicamente
consume y presenta las recomendaciones.

La interfaz de dominio `CatalogRecommendationRepository` desacopla el algoritmo del
cliente HTTP utilizado para consultar Catálogo. La clase lógica
`contentBasedRecommender` concentra los pesos y reglas, evitando mezclar el modelo
matemático con transporte, base de datos o presentación.

Esta distribución mantiene la autonomía de los microservicios: Streaming no accede
directamente a la base de datos de Catálogo y ambos intercambian únicamente contratos e
identificadores.

El modelo matemático, pseudocódigo, diagrama, complejidad y flujo de ejecución se
documentan en [Motor inteligente de recomendación](../Recomendaciones/README.md).

## 14. Terraform — Infraestructura como código

### ¿Qué?

Se utiliza **Terraform** con el provider de Google Cloud para declarar la infraestructura
del proyecto mediante archivos `.tf`. La configuración crea y relaciona:

- la VPC, subredes y reglas de firewall;
- cuatro VMs de Compute Engine;
- el clúster y el node pool de GKE;
- el repositorio de Artifact Registry;
- los buckets de GCS para multimedia y backups;
- cuentas de servicio y permisos IAM.

Las variables permiten parametrizar el proyecto, región, zona y tamaños de máquina. El
estado de Terraform se conserva en un backend remoto de GCS y los `outputs` publican
datos como las IPs de las VMs, el nombre del clúster y la dirección del registro.

### ¿Por qué?

Terraform permite describir el estado deseado de GCP de forma declarativa, repetible y
versionada. Esto evita depender de una secuencia manual de operaciones en la consola,
facilita revisar los cambios con `terraform plan` antes de aplicarlos y reduce
inconsistencias al volver a crear un entorno.

El estado remoto en GCS evita que la referencia principal de los recursos quede ligada a
una sola computadora. La separación por archivos según el tipo de recurso mantiene la
configuración legible y permite localizar con rapidez cambios de red, cómputo,
almacenamiento o permisos.

### ¿Para qué?

Terraform se utiliza para construir la base de infraestructura sobre la que operan los
dos despliegues: las VMs de `develop`, la VM externa de bases de datos, GKE para
`release` y los servicios compartidos de GCP. Sus salidas también alimentan el inventario
de Ansible y la configuración de secretos del pipeline.

La guía de aplicación se encuentra en
[Creación de infraestructura con Terraform](../Terraform/terraform.md).

## 15. Ansible — Configuración de servidores

### ¿Qué?

Se utiliza **Ansible** como herramienta de gestión de configuración sin agentes. Desde
una máquina de control se conecta por SSH a las VMs creadas por Terraform y ejecuta
playbooks YAML.

El inventario agrupa las máquinas según su responsabilidad y los playbooks realizan,
entre otras, las siguientes tareas:

- preparar las VMs de aplicación;
- instalar y configurar Docker;
- crear directorios y archivos de entorno a partir de plantillas Jinja;
- preparar VM3 y levantar los siete contenedores PostgreSQL;
- instalar `node_exporter` como servicio de `systemd` para exponer métricas de VM3.

### ¿Por qué?

Terraform administra recursos de nube, pero no debe concentrar toda la configuración
interna del sistema operativo. Ansible complementa esa capa aplicando de forma
repetible el software y la configuración que necesita cada host.

Se eligió porque opera sobre SSH y no requiere mantener un agente adicional en cada VM.
Sus tareas son idempotentes: pueden volver a ejecutarse para llevar el servidor al estado
declarado sin convertir cada aprovisionamiento en una lista de comandos manuales.

### ¿Para qué?

Ansible convierte las VMs recién creadas en servidores utilizables por Quetzal TV y
mantiene separadas dos responsabilidades:

- **Terraform:** crea la infraestructura en GCP.
- **Ansible:** configura el sistema operativo y los servicios dentro de las VMs.

Esta secuencia permite tomar las IPs producidas por Terraform, incorporarlas al
inventario y configurar los cuatro hosts de manera uniforme. El procedimiento completo
se documenta en [Configuración de infraestructura con Ansible](../ansible/ansible.md).

## 16. Herramientas de pruebas unitarias y cobertura

### ¿Qué?

Las pruebas del backend respetan el ecosistema de cada lenguaje:

- **pytest y pytest-cov:** servicios de Usuarios y Suscripción en Python;
- **`go test` y la cobertura nativa de Go:** servicios de Catálogo y Streaming;
- **Jest, ts-jest y el recolector de cobertura de Jest:** Cobros, Divisas,
  Notificaciones y API Gateway en TypeScript.

Las suites aíslan la lógica mediante repositorios en memoria y mocks cuando una
dependencia real requeriría red, PostgreSQL, Redis, SMTP, GCS o gRPC. El CI ejecuta las
pruebas por servicio y exige una cobertura mínima del **75 %**.

### ¿Por qué?

Utilizar la herramienta estándar o predominante de cada lenguaje reduce configuración
innecesaria y ofrece integración directa con sus modelos de módulos, tipos y reportes:

- pytest facilita fixtures, parametrización y pruebas legibles en Python;
- `go test` está integrado al toolchain de Go y mide cobertura sin una dependencia
  externa;
- Jest ofrece mocks, aserciones y cobertura, mientras `ts-jest` transforma TypeScript
  durante la ejecución.

La cobertura se concentra en dominio, aplicación y código puro. Los entrypoints,
adaptadores de infraestructura y transportes que abren conexiones reales pertenecen a
pruebas de integración o de extremo a extremo; incluirlos artificialmente en la métrica
unitaria haría menos representativa la puerta de calidad.

### ¿Para qué?

Estas herramientas verifican reglas como autenticación, permisos de rutas, planes,
pagos, conversión de moneda, notificaciones, catálogo, reproducción y recomendaciones.
También permiten detectar regresiones antes del merge y generan evidencia cuantificable
para que el pipeline detenga una versión cuando falla una suite o no se alcanza el umbral
de cobertura.

El inventario y los resultados de las suites se detallan en
[Pruebas unitarias](../Pruebas/PruebasUnitarias.md).

## 17. Locust — Pruebas de carga

### ¿Qué?

Se utiliza **Locust** para simular tráfico HTTP concurrente contra Quetzal TV mediante un
escenario escrito en Python. El archivo `locust/locustfile.py` define dos perfiles:

- usuarios anónimos que consultan salud, catálogo, planes y divisas;
- usuarios autenticados que inician sesión y consultan recursos protegidos.

Locust puede ejecutarse con interfaz web para observar la prueba en vivo o en modo
`headless` para automatizarla y producir un reporte HTML. Registra solicitudes por
segundo, tiempos de respuesta, percentiles y fallos por endpoint.

### ¿Por qué?

Las pruebas unitarias demuestran que una función se comporta correctamente de forma
aislada, pero no muestran qué ocurre cuando varios usuarios recorren simultáneamente el
API Gateway y los microservicios. Locust cubre esa necesidad con escenarios programables
que representan proporciones y pausas de usuarios más realistas que una repetición fija
de una sola URL.

Se eligió además porque el escenario se conserva como código, puede versionarse junto a
la aplicación y resulta fácil de extender con nuevos recorridos.

### ¿Para qué?

Locust se utiliza para medir capacidad y latencia, identificar endpoints lentos,
observar errores bajo concurrencia y validar que respuestas esperadas —como un `401` sin
JWT— no se contabilicen como fallos funcionales. El reporte sirve como evidencia de
comportamiento del sistema desplegado y como punto de comparación para futuras
optimizaciones.

La configuración y forma de ejecución se describen en
[Pruebas de carga con Locust](../Locust/Locust.md).

## 18. Elasticsearch, Logstash y Kibana — Centralización de logs

### ¿Qué?

Se utiliza el stack **ELK** en el namespace `quetzaltv-prod`:

- **Logstash:** se ejecuta como `DaemonSet`, lee los logs de los pods desde cada nodo,
  interpreta el formato CRI, extrae metadatos de Kubernetes y envía los eventos;
- **Elasticsearch:** indexa y almacena los eventos en índices diarios
  `logstash-quetzaltv-YYYY.MM.dd`, con un volumen persistente;
- **Kibana:** consulta Elasticsearch y permite explorar los eventos mediante filtros de
  tiempo y búsquedas KQL.

### ¿Por qué?

En Kubernetes los pods son efímeros y pueden ser recreados o reemplazados durante un
rollout. Consultar únicamente `kubectl logs` obliga a conocer el pod y dificulta
relacionar eventos de varios microservicios. ELK concentra esos registros en un punto
consultable y conserva contexto como namespace, pod, contenedor, ambiente y mensaje.

El `DaemonSet` garantiza un recolector Logstash por nodo, Elasticsearch proporciona
búsqueda e indexación adecuadas para un volumen continuo de texto y Kibana ofrece una
interfaz especializada para investigar los datos sin consultar manualmente cada índice.

### ¿Para qué?

El stack permite buscar errores por servicio, investigar respuestas `401` o `500`,
seguir operaciones distribuidas y diagnosticar fallos de base de datos, GCS, streaming o
autorización. También centraliza la evidencia operativa aunque el pod que originó un
evento ya no exista.

La instalación y las consultas de diagnóstico se documentan en
[Centralización de logs con ELK](../EL-STACK/elstack.md).

## 19. Prometheus y Grafana — Observabilidad de métricas

### ¿Qué?

Se utiliza **Prometheus** para recolectar series temporales y **Grafana** para presentar
la telemetría en dashboards. Ambos se despliegan en el namespace separado
`quetzaltv-monitoring`.

Prometheus obtiene métricas mediante:

- descubrimiento de servicios y pods anotados en `quetzaltv-prod`;
- **Node Exporter** como `DaemonSet` para métricas de los nodos de GKE;
- **kube-state-metrics** para el estado de recursos de Kubernetes;
- `node_exporter` instalado por Ansible en VM3 y registrado como objetivo externo.

Grafana utiliza Prometheus como fuente de datos predeterminada y carga dashboards desde
ConfigMaps. Sus credenciales administrativas se obtienen de un Secret y su información
se conserva en un volumen persistente.

### ¿Por qué?

Los logs explican eventos concretos, mientras las métricas muestran tendencias y cambios
del sistema a lo largo del tiempo. Prometheus fue elegido por su modelo de recolección
`pull`, su lenguaje de consulta PromQL y su integración con el descubrimiento de
Kubernetes. Grafana complementa esa recolección con paneles que facilitan comparar
consumo, disponibilidad y estado sin interpretar series crudas.

Separar el monitoreo en su propio namespace reduce el acoplamiento con los recursos de la
aplicación. El descubrimiento dinámico evita mantener IPs de pods, mientras el mecanismo
de objetivos externos permite incorporar la VM de PostgreSQL sin moverla dentro de GKE.

### ¿Para qué?

Prometheus y Grafana se utilizan para observar disponibilidad de objetivos, CPU, memoria,
red, disco, estado de pods, Deployments y nodos, además de la VM externa de bases de
datos. Los dashboards ayudan a detectar saturación, reinicios o pérdida de capacidad y a
correlacionar esas señales con los eventos centralizados en ELK.

## Conclusión

Las decisiones adoptadas mantienen coherencia entre desarrollo, persistencia, seguridad y
despliegue. La arquitectura políglota aprovecha las fortalezas de Python, Go y TypeScript;
PostgreSQL y Redis separan persistencia y caché; Terraform y Ansible hacen repetible la
infraestructura; las herramientas de pruebas y Locust validan corrección y carga; GitHub
Actions automatiza las entregas; y GCP proporciona Compute Engine, GKE, Artifact Registry
y Cloud Storage para ejecutar la plataforma en dos entornos diferenciados. ELK centraliza
los eventos operativos, mientras Prometheus y Grafana proporcionan visibilidad sobre las
métricas de Kubernetes y la infraestructura externa.

[Volver a Documentación](../Documentación.md)
