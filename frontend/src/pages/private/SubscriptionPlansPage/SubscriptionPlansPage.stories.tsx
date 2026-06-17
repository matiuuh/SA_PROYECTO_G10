import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { SubscriptionPlansPage } from './SubscriptionPlansPage'

const meta = {
  title: 'Pages/Private/SubscriptionPlansPage',
  component: SubscriptionPlansPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/subscription/plans']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof SubscriptionPlansPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
