# Requerimientos No Funcionales — Quetzal TV

| ID | Atributo de Calidad | Requerimiento | Especificación Cuantitativa |
|----|---------------------|---------------|-----------------------------|
| RNF-01 | Rendimiento | Tiempo de respuesta del catálogo | El catálogo de contenidos debe cargarse y renderizarse en un tiempo máximo de 2 segundos bajo carga normal. Las búsquedas y filtros deben retornar resultados en menos de 1 segundo. |
| RNF-02 | Seguridad | Autenticación y cifrado de credenciales | Todas las rutas protegidas deben validar un token JWT en el API Gateway antes de redirigir la petición. Las contraseñas deben almacenarse cifradas con bcrypt. |
| RNF-03 | Seguridad | Propagación de identidad entre servicios | La comunicación gRPC interna debe incluir un JWT firmado por el API Gateway. Cada microservicio receptor debe validar dicho token antes de procesar la solicitud. Ningún servicio debe confiar en datos de identidad enviados sin token. |
| RNF-04 | Seguridad | Gestión de secretos | Toda información sensible (URLs de conexión, claves de API, contraseñas de base de datos) debe gestionarse mediante archivos `.env` excluidos del repositorio. Ningún secreto puede estar hardcodeado en el código fuente ni en los archivos Docker. |
| RNF-05 | Seguridad | Punto de entrada único | Ningún microservicio del backend debe exponerse directamente al cliente externo. El API Gateway es el único punto de entrada, encargado de centralizar el enrutamiento, la validación de sesión y el control de acceso. |
| RNF-06 | Escalabilidad | Escalabilidad horizontal independiente | Cada microservicio debe poder escalar de forma independiente sin afectar a los demás. La arquitectura debe soportar un incremento de hasta 3x la carga nominal sin degradación perceptible del servicio. |
| RNF-07 | Disponibilidad | Tolerancia a fallos del FX-Service | En caso de fallo o no disponibilidad del proveedor externo de tipos de cambio, el sistema debe servir el último valor almacenado en Redis sin retornar error al usuario, manteniendo la operatividad de la plataforma. |
| RNF-08 | Confiabilidad | Aislamiento de datos por perfil | El historial de reproducción, las calificaciones y las preferencias de cada perfil deben estar completamente aislados entre sí dentro de la misma cuenta. Un perfil no puede leer ni modificar el historial de otro perfil. |
| RNF-09 | Interoperabilidad | Comunicación exclusiva por gRPC | Toda comunicación interna entre microservicios debe realizarse mediante gRPC con contratos definidos en Protocol Buffers. No se permiten llamadas REST directas entre servicios del backend. |
| RNF-10 | Mantenibilidad | Código limpio y principios SOLID | El código fuente de cada microservicio debe aplicar los principios SOLID. Cada lenguaje debe adherirse a sus estándares de estilo. |
| RNF-11 | Portabilidad | Contenedores e infraestructura reproducible | Cada microservicio, base de datos, instancia de Redis y el API Gateway deben contar con su propio `Dockerfile`. El sistema completo debe poder desplegarse mediante `docker-compose.local.yml` en desarrollo y `docker-compose.cloud.yml` en producción, sin modificar el código fuente entre entornos. |

[Volver a Documentación](../Documentación.md)
