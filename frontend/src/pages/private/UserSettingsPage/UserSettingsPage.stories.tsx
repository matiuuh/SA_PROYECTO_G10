import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { UserSettingsPage } from './UserSettingsPage'

const meta = {
  title: 'Pages/Private/UserSettingsPage',
  component: UserSettingsPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/settings']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof UserSettingsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Account: Story = {}

export const Preferences: Story = {}
