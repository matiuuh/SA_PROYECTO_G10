# Proto Contracts

Aqui van los contratos `gRPC` y `Protocol Buffers` compartidos entre servicios.

Sugerencia:

- `common/`: mensajes reutilizables, errores comunes, paginacion
- `<servicio>/v1/`: contratos versionados por servicio

Ejemplo:

```text
proto/
├── common/
│   └── pagination.proto
└── usuario/v1/
    └── usuario_service.proto
```
