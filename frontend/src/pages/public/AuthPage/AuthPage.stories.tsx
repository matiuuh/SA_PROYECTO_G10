import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthPage } from './AuthPage'

const meta = {
  title: 'Pages/Public/AuthPage',
  component: AuthPage,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080c14' }],
    },
  },
  decorators: [
    (Story, context) => (
      <MemoryRouter initialEntries={[context.args._initialPath ?? '/login']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof AuthPage>

export default meta
type Story = StoryObj<typeof meta>

export const Login: Story = {
  args: { _initialPath: '/login' } as never,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/login']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Register: Story = {
  args: { _initialPath: '/register' } as never,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/register']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
