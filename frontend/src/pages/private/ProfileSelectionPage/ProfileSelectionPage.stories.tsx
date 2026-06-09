import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileSelectionPage } from './ProfileSelectionPage'

const meta = {
  title: 'Pages/Private/ProfileSelectionPage',
  component: ProfileSelectionPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/profiles']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ProfileSelectionPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
