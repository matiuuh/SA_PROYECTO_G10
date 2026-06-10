import type { Meta, StoryObj } from '@storybook/react'
import { PurchaseReceipt } from './PurchaseReceipt'

const meta = {
  title: 'Organisms/PurchaseReceipt',
  component: PurchaseReceipt,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PurchaseReceipt>

export default meta
type Story = StoryObj<typeof meta>

const mockPlan = {
  id: 'premium',
  name: 'Plan Premium',
  price: 14.99,
  features: [
    'Acceso ilimitado a todo el catálogo',
    'Calidad 4K Ultra HD',
    'Hasta 4 pantallas simultáneas',
    'Descargas sin límite',
    'Audio espacial Dolby Atmos',
  ],
}

export const Default: Story = {
  args: {
    plan: mockPlan,
    orderId: 'ORD-2024-94038',
    orderDate: '6 de junio de 2026',
    paymentMethod: 'Visa terminada en 4242',
    transactionId: 'TXN-72940251',
  },
}

export const StandardPlan: Story = {
  args: {
    plan: {
      id: 'standard',
      name: 'Plan Estándar',
      price: 9.99,
      features: [
        'Acceso al catálogo completo',
        'Calidad Full HD',
        'Hasta 2 pantallas simultáneas',
        'Descargas limitadas',
      ],
    },
    orderId: 'ORD-2024-83921',
    orderDate: '5 de junio de 2026',
    paymentMethod: 'Mastercard terminada en 8888',
    transactionId: 'TXN-83921456',
  },
}

export const BasicPlan: Story = {
  args: {
    plan: {
      id: 'basic',
      name: 'Plan Básico',
      price: 5.99,
      features: ['Acceso al catálogo completo', 'Calidad HD', '1 pantalla'],
    },
    orderId: 'ORD-2024-12345',
    orderDate: '4 de junio de 2026',
    paymentMethod: 'PayPal',
  },
}
