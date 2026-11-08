import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PageMain } from './page-main'

const meta = {
  title: 'Shared/PageMain',
  component: PageMain,
  args: {
    children: <p className="rounded-2xl bg-surface-card p-5">A screen&apos;s content</p>,
  },
} satisfies Meta<typeof PageMain>

export default meta

type Story = StoryObj<typeof meta>

export const WithNavigation: Story = {}

export const TaskScreen: Story = { args: { hasNav: false } }
