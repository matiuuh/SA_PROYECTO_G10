# Servicio Cobros

Lenguaje: `TypeScript`

Responsabilidades:

- procesamiento de pagos
- recibos
- integracion con suscripciones

Notas de integracion:

- `ProcesarPago` recibe `cuenta_id`, `suscripcion_id` y `plan_id`
- por ahora el pago es simulado y siempre termina como `aprobado`
- `monto_local` se obtiene desde `divisas-service`
- la moneda base asumida en cobros es `USD`, configurable con `BASE_CURRENCY`
- cuando el pago queda aprobado intenta enviar el recibo via `notificaciones-service`
