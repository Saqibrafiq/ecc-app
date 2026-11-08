import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ScreenHeader } from './screen-header'

const meta = {
  title: 'Shared/ScreenHeader',
  component: ScreenHeader,
  args: { eyebrow: 'ECC I · Captain', title: 'Your team' },
} satisfies Meta<typeof ScreenHeader>

export default meta

type Story = StoryObj<typeof meta>

export const Top: Story = {}

/** A sub-screen, with the way back up and extra content below the title. */
export const WithBack: Story = {
  args: {
    eyebrow: 'Squad · Sat, Nov 14',
    title: 'vs Nürnberg CC',
    back: { href: '/team', label: 'Team' },
    children: <p className="text-sm text-text-muted">15 going · 2 not going · 2 no answer</p>,
  },
}

export const Preview: Story = {
  args: { previewNote: 'Preview with sample data, shown as Wednesday' },
}
