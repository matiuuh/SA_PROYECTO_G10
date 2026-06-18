# Diagrama de Arquitectura — Despliegue Develop

## Descripción general

![Diagrama de Arquitectura Despliegue Develop](./img/Diagrama%20de%20Arquitectura%20Despliegue%20Develop.png)

El diagrama representa la arquitectura de **Quetzal TV** desplegada en el entorno
`develop` dentro de **Google Cloud Platform**. La solución utiliza máquinas virtuales de
**Compute Engine**, contenedores **Docker**, comunicación interna mediante **gRPC**,
bases de datos PostgreSQL independientes y un pipeline de **CI/CD con GitHub Actions**.

Los usuarios y administradores acceden desde dispositivos móviles o computadoras mediante
HTTP. Las solicitudes ingresan por el componente **Ingress**, que funciona como punto de
acceso externo y dirige el tráfico hacia el frontend y el API Gateway. Ningún
microservicio ni base de datos se expone directamente a los clientes.

## Distribución en Compute Engine

La arquitectura se distribuye en cuatro máquinas virtuales:

| Máquina virtual | Componentes desplegados |
| --- | --- |
| VM1 | Frontend React con Vite y API Gateway |
| VM2 | Usuarios, Suscripción y Catálogo |
| VM3 | Notificaciones, Cobros, Divisas, Streaming y Redis |
| VM4 | Bases de datos PostgreSQL de todos los microservicios |

Cada componente se ejecuta dentro de su propio contenedor Docker. Esta distribución
separa la capa de acceso, los servicios principales, los servicios auxiliares y la
persistencia de datos.

## Frontend y API Gateway

El frontend está desarrollado con **React y Vite** y proporciona las interfaces para
usuarios y administradores. Todas las operaciones del cliente pasan por el **API Gateway**,
que centraliza el enrutamiento, la autenticación y la propagación de identidad mediante
JWT.

El API Gateway se comunica con los microservicios internos mediante **gRPC**, evitando
que los clientes accedan directamente a los servicios de negocio.

## Microservicios

La plataforma utiliza un backend políglota compuesto por:

- **Usuarios — Python:** registro, autenticación, cuentas y perfiles.
- **Suscripción — Python:** planes, suscripciones y cambios de plan.
- **Catálogo — Go:** películas, series, temporadas, episodios y calificaciones.
- **Streaming — Go:** reproducción e historial de visualización.
- **Cobros — TypeScript:** pagos, transacciones y recibos.
- **Divisas — TypeScript:** consulta y conversión de tipos de cambio.
- **Notificaciones — TypeScript:** envío y registro de notificaciones por correo.

El servicio de **Divisas** utiliza Redis como caché para reducir consultas repetitivas al
proveedor externo de tipos de cambio. El servicio de **Notificaciones** se conecta con un
proveedor SMTP para realizar el envío de correos.

## Persistencia y auditoría

La arquitectura aplica el patrón **Database per Microservice**. Cada servicio dispone de
su propia base de datos PostgreSQL:

- Usuarios
- Suscripción
- Catálogo
- Streaming
- Cobros
- Divisas
- Notificaciones

Las bases de datos contienen **triggers** que registran automáticamente las operaciones de
inserción, actualización y eliminación en sus respectivas tablas de auditoría. Estos
registros conservan información como la tabla afectada, el usuario responsable, la fecha
del evento y los estados anterior y nuevo.

La comunicación entre los microservicios y PostgreSQL utiliza conexiones TCP dentro de la
red privada de Google Cloud.

## Google Cloud Storage

La arquitectura utiliza dos buckets de Google Cloud Storage:

- **Bucket de streaming:** almacena videos, capítulos y portadas. Los servicios de
  Catálogo y Streaming gestionan estos archivos y generan las URLs necesarias para su
  consumo.
- **Bucket de backups:** conserva las copias de seguridad de las siete bases de datos
  PostgreSQL.

Redis se excluye del proceso de respaldo porque funciona como una caché temporal en
memoria.

## Integración y despliegue continuo

El pipeline de `develop` se ejecuta mediante **GitHub Actions**:

1. El código se obtiene desde GitHub.
2. Se ejecutan las pruebas unitarias y se valida una cobertura mínima del **75 %**.
3. Si las pruebas son exitosas, se construyen las imágenes Docker.
4. Las imágenes se publican en **Google Artifact Registry**.
5. GitHub Actions ordena el despliegue automático en las máquinas virtuales de Compute
   Engine.
6. Antes del despliegue se ejecuta el backup de las bases de datos y se almacena en el
   bucket de backups.

Artifact Registry funciona únicamente como repositorio privado de imágenes. El despliegue
es iniciado por GitHub Actions y las máquinas virtuales descargan desde allí las imágenes
correspondientes a la versión de `develop`.

Si las pruebas, la compilación o el proceso de backup fallan, el pipeline se detiene y no
continúa con la publicación ni con el despliegue.

## Flujo general

El funcionamiento de la arquitectura puede resumirse de la siguiente manera:

1. El usuario o administrador envía una solicitud.
2. Ingress dirige la solicitud al frontend o al API Gateway.
3. El API Gateway valida y enruta la operación.
4. Los microservicios se comunican internamente mediante gRPC.
5. Cada microservicio accede exclusivamente a su propia base de datos.
6. Los triggers registran automáticamente los cambios en las tablas de auditoría.
7. Streaming y Catálogo utilizan Cloud Storage para videos y portadas.
8. GitHub Actions mantiene actualizado el entorno `develop` mediante CI/CD.

## Arquitectura Kubernetes — Despliegue Release

![Diagrama de Arquitectura Despliegue Kubernetes](./img/Diagrama%20de%20Arquitectura%20Despliegue%20Kubernetes.png)

Esta segunda arquitectura representa el entorno asociado a la rama `release`. A
diferencia del despliegue de `develop`, los componentes de aplicación se ejecutan dentro
de un clúster de **Google Kubernetes Engine (GKE)**.

El clúster contiene un nodo de trabajo donde cada componente se despliega como un pod
independiente:

- Pod Frontend
- Pod API Gateway
- Pod Usuarios
- Pod Suscripción
- Pod Catálogo
- Pod Streaming
- Pod Cobros
- Pod Divisas
- Pod Notificaciones
- Pod Redis

Esta separación permite que Kubernetes administre individualmente la ejecución,
reinicio, actualización y escalamiento de cada componente.

### Acceso mediante Ingress

Los usuarios y administradores acceden al sistema por medio de **Ingress**, que constituye
el único punto de entrada público al clúster. Ingress dirige las solicitudes hacia el
frontend y el API Gateway, mientras que el resto de los pods permanece accesible
únicamente dentro de la red interna de Kubernetes.

El API Gateway conserva su responsabilidad como punto central de autenticación y
enrutamiento. Desde este componente se realizan las comunicaciones internas con los
microservicios mediante gRPC y JWT.

### Persistencia fuera del clúster

Las siete bases de datos PostgreSQL se mantienen en una máquina virtual de **Compute
Engine**, separadas de los pods de aplicación. Cada microservicio se conecta mediante TCP
exclusivamente con su propia base de datos.

Las bases conservan sus triggers y tablas de auditoría para registrar operaciones de
inserción, actualización y eliminación. Esta separación permite que los datos persistan
independientemente de la creación, sustitución o reinicio de los pods.

### Cloud Storage y servicios externos

La arquitectura utiliza los mismos recursos externos del entorno `develop`:

- El bucket de streaming almacena videos y portadas.
- El bucket de backups conserva los respaldos de PostgreSQL.
- El proveedor de divisas entrega los tipos de cambio.
- El proveedor SMTP permite enviar correos electrónicos.

Redis se ejecuta dentro del clúster como un pod independiente y continúa funcionando como
caché temporal para el servicio de Divisas.

### CI/CD de la rama release

El despliegue hacia GKE se realiza exclusivamente mediante GitHub Actions:

1. Un cambio aprobado se integra en la rama `release`.
2. El pipeline ejecuta las pruebas y valida una cobertura mínima del 75 %.
3. Si las validaciones son exitosas, crea la versión semántica correspondiente.
4. Se construyen y publican las imágenes Docker en Artifact Registry.
5. Se ejecuta el backup automático de las bases de datos.
6. GitHub Actions aplica los manifiestos YAML al clúster GKE.
7. Kubernetes descarga las imágenes desde Artifact Registry y actualiza los pods.

El despliegue utiliza una estrategia **RollingUpdate** para sustituir gradualmente los
pods sin interrumpir el servicio. Las sondas **readiness** determinan cuándo un pod está
listo para recibir tráfico y las sondas **liveness** permiten reiniciar contenedores que
dejen de responder.

Si la nueva versión no completa correctamente el rollout o presenta errores como
`CrashLoopBackOff`, el pipeline ejecuta un rollback automático para restaurar la última
versión estable.

## Comparación de los entornos

| Característica | Develop | Release |
| --- | --- | --- |
| Destino | Compute Engine | Google Kubernetes Engine |
| Ejecución | Contenedores Docker distribuidos en VMs | Pods administrados por Kubernetes |
| Imágenes | Artifact Registry con tag `develop-SHA` | Artifact Registry con tag semántico `v2.x.0` |
| Despliegue | Docker Compose mediante GitHub Actions | Manifiestos YAML mediante GitHub Actions |
| Actualización | Reinicio de contenedores | RollingUpdate |
| Recuperación | Conservación de la versión anterior | Rollback automático |
| Bases de datos | VM de Compute Engine | VM de Compute Engine externa al clúster |

## Conclusión general

Las dos arquitecturas mantienen los mismos dominios, contratos gRPC, bases de datos y
servicios externos, pero emplean estrategias distintas de despliegue según la rama.
`Develop` utiliza máquinas virtuales de Compute Engine para integración continua,
mientras que `release` utiliza GKE para obtener orquestación, actualizaciones progresivas,
monitoreo de salud y rollback automático.

GitHub Actions, Artifact Registry y Cloud Storage complementan ambos entornos,
proporcionando pruebas automatizadas, distribución privada de imágenes y respaldo de la
información.

[Volver a Documentación](../Documentación.md)
