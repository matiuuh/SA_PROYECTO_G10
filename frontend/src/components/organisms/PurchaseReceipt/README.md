# PurchaseReceipt Component

Componente de comprobante de compra con diseño inspirado en boletos de cine. Presenta la información de la transacción de forma profesional y limpia, con estética cinematográfica adaptada a la paleta de colores denim del proyecto.

## Características

- **Diseño de boleto de cine**: Layout dividido con perforaciones simuladas
- **Código QR simulado**: Representación visual de comprobante digital
- **Código de barras**: Identificador visual adicional
- **Responsive**: Adaptable a móvil (vertical) y escritorio (horizontal)
- **Función de impresión**: Botón para descargar/imprimir el recibo
- **Copia de código**: Permite copiar el ID de orden al portapapeles
- **Animaciones sutiles**: Efectos hover y transiciones suaves

## Props

```typescript
interface PurchaseReceiptProps {
  plan: SubscriptionPlan          // Plan de suscripción adquirido
  orderId: string                  // ID único de la orden
  orderDate: string                // Fecha de la compra
  paymentMethod?: string           // Método de pago usado (opcional)
  transactionId?: string           // ID de transacción (opcional)
}
```

## Uso

```tsx
import { PurchaseReceipt } from '@/components/organisms'

function ConfirmationPage() {
  return (
    <PurchaseReceipt
      plan={selectedPlan}
      orderId="ORD-2024-94038"
      orderDate="6 de junio de 2026"
      paymentMethod="Visa terminada en 4242"
      transactionId="TXN-72940251"
    />
  )
}
```

## Diseño

### Estructura del Boleto

1. **Sección Principal (Izquierda/Superior)**:
   - Encabezado con logo y estado
   - Nombre del plan y descripción
   - Información de fecha y hora
   - Código de orden (con función copiar)
   - Desglose de pago (subtotal, IVA, total)
   - Método de pago e ID de transacción

2. **Separador Perforado**:
   - Círculos de corte simulados
   - Línea punteada vertical/horizontal

3. **Talón de Control (Derecha/Inferior)**:
   - Código QR simulado
   - Estado de verificación
   - Código de barras
   - ID de orden repetido

### Paleta de Colores

- **Fondo principal**: `#0d1220`
- **Fondo secundario**: `#0a0e16`
- **Bordes**: `white/[0.07]`
- **Acentos**: Variables denim (`--color-denim-*`)
- **Éxito**: `--color-success`
- **Degradados**: Denim 500-600

### Responsive

- **Móvil**: Layout vertical (flex-col)
- **Escritorio** (md+): Layout horizontal (flex-row)
- **Perforaciones**: Ajustadas según orientación

## Impresión

El componente incluye estilos específicos para impresión:
- Oculta elementos decorativos (`.no-print`)
- Optimiza colores para papel
- Mantiene estructura legible

## Inspiración

Basado en diseños de boletos de cine modernos con:
- Estética limpia y profesional
- Elementos visuales reconocibles (QR, código de barras)
- Jerarquía visual clara
- Información organizada por importancia
