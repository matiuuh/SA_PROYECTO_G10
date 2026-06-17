import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { MovieDetailPage } from './MovieDetailPage'

const meta = {
  title: 'Pages/Private/MovieDetailPage',
  component: MovieDetailPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/movie/el-ultimo-horizonte']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof MovieDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
