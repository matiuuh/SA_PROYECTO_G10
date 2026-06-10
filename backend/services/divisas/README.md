# Servicio Divisas

Lenguaje: `TypeScript`

Responsabilidades:

- tipos de cambio
- cache Redis con TTL
- conversion de precios

Notas de integracion:

- expone gRPC en el puerto `5005`
- usa `Redis` como cache principal y `PostgreSQL` como respaldo durable
- en Docker debe apuntar a la base `quetzal_divisas`
