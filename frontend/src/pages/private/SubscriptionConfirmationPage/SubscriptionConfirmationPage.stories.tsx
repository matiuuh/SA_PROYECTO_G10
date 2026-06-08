import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { SubscriptionConfirmationPage } from './SubscriptionConfirmationPage'

const meta = {
  title: 'Pages/Private/SubscriptionConfirmationPage',
  component: SubscriptionConfirmationPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SubscriptionConfirmationPage>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/confirmation?order=ORD-2024-94038&plan=standard']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Premium: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/confirmation?order=ORD-2024-00001&plan=premium']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Basic: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/confirmation?order=ORD-2024-00002&plan=basic']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
