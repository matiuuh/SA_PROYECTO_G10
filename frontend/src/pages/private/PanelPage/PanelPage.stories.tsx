import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { PanelPage } from './PanelPage'

const meta = {
  title: 'Pages/Private/PanelPage',
  component: PanelPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/panel']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof PanelPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
