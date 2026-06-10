# Defensa del despliegue en GCP — Quetzal TV

## ¿Cómo se realizó el despliegue en Google Cloud Platform?

Para el despliegue de Quetzal TV se utilizó una arquitectura distribuida basada en **4 máquinas virtuales (VMs)** dentro de Google Cloud Platform utilizando **Compute Engine**.

La decisión de separar el sistema en múltiples VMs se tomó para simular un entorno más cercano a producción y aplicar principios reales de arquitectura distribuida y microservicios.

---

## Paso 1 — Creación de las VMs

Primero se crearon las 4 máquinas virtuales en GCP.

Cada VM fue diseñada para cumplir responsabilidades específicas:

| VM  | Responsabilidad                                                                    |
| --- | ---------------------------------------------------------------------------------- |
| VM1 | Servicios principales (`usuario`, `suscripcion`, `catalogo`)                       |
| VM2 | Servicios auxiliares (`divisas`, `cobros`, `notificaciones`, `streaming`, `Redis`) |
| VM3 | Bases de datos PostgreSQL                                                          |
| VM4 | API Gateway y frontend React                                                       |

Esta separación permitió organizar la infraestructura por dominios y responsabilidades.

---

## Paso 2 — Configuración de red privada (VPC)

Las VMs fueron conectadas mediante una red privada interna de GCP (VPC).

Esto permitió que:

* Los microservicios se comunicaran internamente.
* Las bases de datos no estuvieran expuestas a internet.
* La comunicación gRPC se mantuviera privada.
* Solo el API Gateway fuera accesible públicamente.

La VM4 fue la única con IP pública y puerto 80 expuesto.

---

## Paso 3 — Configuración de reglas de firewall

Se configuraron reglas de firewall para restringir el tráfico entre VMs.

Se permitió:

* Puerto `80` únicamente en VM4 para acceso web público.
* Puertos `5001-5007` para comunicación gRPC interna.
* Puertos `8001-8007` para APIs HTTP internas.
* Puertos `5433-5439` únicamente para PostgreSQL interno.
* Puerto `6379` para Redis interno.

Con esto se evitó que usuarios externos pudieran acceder directamente a microservicios o bases de datos.

---

## Paso 4 — Instalación de Docker

En cada VM se instaló Docker y Docker Compose para ejecutar todos los servicios mediante contenedores.

Esto permitió:

* Mantener entornos reproducibles.
* Facilitar despliegues.
* Aislar dependencias por microservicio.
* Ejecutar servicios en distintos lenguajes sin conflictos.

---

## Paso 5 — Clonación del repositorio y configuración

En cada VM se clonó el repositorio del proyecto y se configuró el archivo `.env`.

El `.env` contenía:

* IPs privadas de las VMs.
* Variables de PostgreSQL.
* JWT_SECRET.
* Variables SMTP.
* Configuración de Redis.
* Variables del API Gateway.

Esto permitió que todos los servicios pudieran encontrarse y comunicarse correctamente.

---

## Paso 6 — Separación de Docker Compose por VM

Se crearon archivos Docker Compose independientes para cada máquina virtual:

| Archivo                        | VM  |
| ------------------------------ | --- |
| `docker-compose.cloud-vm1.yml` | VM1 |
| `docker-compose.cloud-vm2.yml` | VM2 |
| `docker-compose.cloud-vm3.yml` | VM3 |
| `docker-compose.cloud-vm4.yml` | VM4 |

Esto permitió desplegar únicamente los servicios correspondientes a cada VM.

---

## Paso 7 — Orden del despliegue

El despliegue se realizó siguiendo un orden específico debido a las dependencias entre servicios.

### Primero — VM3 (Bases de datos)

Las bases de datos PostgreSQL se levantaron primero porque todos los servicios dependen de ellas.

---

### Segundo — VM2 (Servicios auxiliares)

Luego se desplegaron:

* Redis
* divisas
* cobros
* notificaciones
* streaming

Estos servicios dependen de PostgreSQL y Redis.

---

### Tercero — VM1 (Servicios principales)

Después se levantaron:

* usuario
* suscripcion
* catalogo

Estos servicios dependen de PostgreSQL y de la comunicación gRPC interna.

---

### Cuarto — VM4 (Frontend y API Gateway)

Finalmente se desplegó:

* API Gateway
* Frontend React

El Gateway fue el último porque depende de que los demás servicios ya estén disponibles para poder enrutar solicitudes.

---

## Paso 8 — Verificación del sistema

Finalmente se realizaron pruebas de conectividad y funcionamiento:

* Comunicación entre microservicios.
* Comunicación gRPC.
* Conexión a PostgreSQL.
* Funcionamiento del API Gateway.
* Acceso al frontend desde internet.
* Comunicación interna mediante VPC.

Con esto se validó que la arquitectura distribuida funcionara correctamente dentro de Google Cloud Platform.

---

## Conclusión de la defensa

El despliegue en GCP permitió demostrar una arquitectura distribuida real basada en microservicios, separación de responsabilidades y seguridad por capas.

La utilización de 4 VMs permitió:

* Aislar bases de datos.
* Mantener servicios internos protegidos.
* Centralizar el acceso mediante API Gateway.
* Separar responsabilidades por dominio.
* Simular una infraestructura cercana a producción real.

Además, el uso de Docker, redes privadas y reglas de firewall permitió mantener un entorno organizado, seguro y escalable.

[Volver a Documentación](../Documentación.md)