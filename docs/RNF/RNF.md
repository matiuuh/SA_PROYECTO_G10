# Requerimientos No Funcionales — Quetzal TV

| ID | Atributo de Calidad | Requerimiento | Especificación Cuantitativa |
|----|---------------------|---------------|-----------------------------|
| RNF-01 | Rendimiento | Tiempo de respuesta del catálogo | El catálogo de contenidos debe cargarse y renderizarse en un tiempo máximo de 3 segundos bajo carga normal. Las búsquedas y filtros deben retornar resultados en menos de 3 segundos. |
| RNF-02 | Seguridad | Autenticación y cifrado de credenciales | Todas las rutas protegidas deben validar un token JWT en el API Gateway antes de redirigir la petición. Las contraseñas deben almacenarse cifradas con bcrypt. |
| RNF-03 | Seguridad | Propagación de identidad entre servicios | La comunicación gRPC interna debe incluir un JWT firmado por el API Gateway. Cada microservicio receptor debe validar dicho token antes de procesar la solicitud. Ningún servicio debe confiar en datos de identidad enviados sin token. |
| RNF-04 | Seguridad | Punto de entrada único | Ningún microservicio del backend debe exponerse directamente al cliente externo. El API Gateway es el único punto de entrada, encargado de centralizar el enrutamiento, la validación de sesión y el control de acceso. |
| RNF-05 | Disponibilidad | Tolerancia a fallos del FX-Service | En caso de fallo o no disponibilidad del proveedor externo de tipos de cambio, el sistema debe servir el último valor almacenado en Redis sin retornar error al usuario, manteniendo la operatividad de la plataforma. |
| RNF-06 | Confiabilidad | Aislamiento de datos por perfil | El historial de reproducción, las calificaciones y las preferencias de cada perfil deben estar completamente aislados entre sí dentro de la misma cuenta. Un perfil no puede leer ni modificar el historial de otro perfil. |
| RNF-07 | Interoperabilidad | Comunicación exclusiva por gRPC | Toda comunicación interna entre microservicios debe realizarse mediante gRPC con contratos definidos en Protocol Buffers. No se permiten llamadas REST directas entre servicios del backend. |
| RNF-08 | Portabilidad | Contenedores e infraestructura reproducible | Cada microservicio, base de datos, instancia de Redis y el API Gateway deben contar con su propio `Dockerfile`. El sistema completo debe poder desplegarse mediante `docker-compose.local.yml` en desarrollo y `docker-compose.cloud.yml` en producción, sin modificar el código fuente entre entornos. |
| RNF-09 | Mantenibilidad | Código modular y documentado | El código de cada microservicio debe estar organizado en módulos claros (controladores, servicios, repositorios) y contar con documentación inline. Las interfaces gRPC deben estar definidas en archivos `.proto` con comentarios explicativos. |
| RNF-10 | Sostenibilidad | Backups regulares de bases de datos | El sistema debe realizar backups automáticos cuando se hagan nuevos despliegues de las bases de datos PostgreSQL y almacenarlos en un servicio de almacenamiento seguro. En caso de pérdida de datos, el sistema debe poder restaurar la última copia de seguridad sin pérdida significativa de información. |

[Volver a Documentación](../Documentación.md)
