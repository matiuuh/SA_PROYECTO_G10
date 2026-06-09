import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { SubscriptionCheckoutPage } from './SubscriptionCheckoutPage'

const meta = {
  title: 'Pages/Private/SubscriptionCheckoutPage',
  component: SubscriptionCheckoutPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/checkout?plan=standard']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof SubscriptionCheckoutPage>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Basic: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/checkout?plan=basic']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Premium: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/checkout?plan=premium']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
