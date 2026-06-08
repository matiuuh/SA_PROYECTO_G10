import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { UserProfilePage } from './UserProfilePage'

const meta = {
  title: 'Pages/Private/UserProfilePage',
  component: UserProfilePage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/profile']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof UserProfilePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
