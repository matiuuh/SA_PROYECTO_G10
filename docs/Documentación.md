# Documentación del Proyecto Fase : Quetzal TV

Integrantes:

| Nombre completo                | Carnet    |
| ------------------------------ | --------- |
| Chacon Trampe Juan Esteban     | 202300431 |
| Diego Noriega Mateo Estuardo   | 202203009 |
| Hernandez Flores Daniel Andree | 202300512 |
| Lopez Leveron Estiben Yair     | 202204578 |
| Pablo Sosof Jens Jeremy        | 202102771 |

## Indice


### Requerimientos del sistema

- [Requerimientos funcionales](./RF/RF.md)
- [Requerimientos no funcionales](./RNF/RNF.md)
- [Mockups Del Frontend](mockups/mockups.md)

### Modelo de Casos de Uso

- [Casos de uso](./CasosDeUso/casosDeUso.md)

### Vista de Arquitectura 4+1

- [Vistas 4+1](./vistas_4_+_1/vista4+1.md)

### Diagramas Estructurales, Comportamentales y Persistencia

- [Diagrama de arquitectura general](./Diagramas%20Estructurales/Diagrama%20de%20Arquitectura.md)
- [Diagrama de actividades](./Actividades/Diagrama_Actividades.md)
- [Diagramas entidad relacion](./ER/EntidadRelacion.md)
- [Diagrama local](/docs/Local/Diagrama%20Despliegue%20Proyecto-Page-2.drawio.svg)

### Principios Solid
- [Principios Solid](./Principios_Solid/Principios_Solid.md)

### Justificacion de Toma de decisiones
- [Justificacion toma de decisiones](./Justificacion/justificacion_decisiones.md)

### Pruebas Unitarias
- [Pruebas unitarias del backend](./Pruebas/PruebasUnitarias.md)

### Pruebas de carga
- [Pruebas de carga con Locust](./Locust/Locust.md)

### Diagramas Estructurales, Comportamentales y Persistencia
- [Defensa_DesplieguesGCP](./DespliegueGCP/DefensaDespliegueGCP.md)
- [Despliegue de infraestructura](./Terraform/terraform.md)
- [Configuración de infraestructura](./ansible/ansible.md)

## Introducción

El presente documento corresponde al Proyecto del curso de Software Avanzado, cuyo objetivo es el diseño y desarrollo de **Quetzal TV**, una plataforma de streaming de video bajo demanda orientada a operar en múltiples países con soporte para diferentes divisas y pasarelas de pago locales.

El sistema está construido sobre una **arquitectura de microservicios poliglota**, donde cada dominio del negocio opera como un servicio completamente autónomo con su propia base de datos. Los microservicios del backend se desarrollan de forma simultánea en **TypeScript, Go y Python**, seleccionados estratégicamente según las características de cada dominio. Toda la comunicación interna entre servicios se realiza de forma síncrona mediante el protocolo **gRPC**, garantizando interoperabilidad estricta entre lenguajes.

La seguridad y el enrutamiento se centralizan en un **API Gateway**, único punto de entrada al sistema. Este componente valida las sesiones de usuario mediante **JWT** para la propagación de identidad entre servicios. Para optimizar el rendimiento en consultas de divisas, el **FX-Service** implementa una capa de caché con **Redis** y políticas TTL, evitando consultas repetitivas a APIs externas.

La plataforma cubre siete módulos principales: autenticación y gestión de múltiples perfiles, administración de planes y suscripciones, catálogo con búsqueda y filtrado avanzado, sistema de calificaciones dinámico, conversión de precios en moneda local, historial de reproducción por perfil y notificaciones por correo electrónico. Toda la infraestructura está contenedorizada con **Docker** y orquestada mediante **Docker Compose**, con configuraciones diferenciadas para entornos de desarrollo local y producción en la nube.

Este archivo funciona como índice principal de la documentación. Desde aquí se puede acceder a cada uno de los documentos del proyecto.

## Conclusiones

1. La arquitectura de microservicios poliglota con servicios en TypeScript, Go y Python, permite asignar el lenguaje más adecuado a cada dominio del negocio, aprovechando las fortalezas de cada tecnología y manteniendo el desacoplamiento total entre servicios.

2. El uso de gRPC con contratos en Protocol Buffers como protocolo exclusivo de comunicación interna garantiza tipado estricto y compatibilidad entre los diferentes lenguajes del backend, reduciendo errores de integración en un entorno distribuido.

3. La implementación de Redis como capa de caché en el FX-Service, con políticas TTL bien definidas, optimiza el rendimiento de las consultas de divisas y protege la disponibilidad de la plataforma ante fallos del proveedor externo de tipos de cambio.

4. La contenedorización con Docker y la configuración de dos entornos diferenciados mediante Docker Compose garantizan que el sistema sea reproducible y portable, eliminando discrepancias entre el entorno de desarrollo local y el de producción en la nube.

5. La centralización del enrutamiento, la validación de sesiones y el control de acceso en el API Gateway establece un perímetro de seguridad claro, asegurando que ningún microservicio quede expuesto directamente al cliente externo.