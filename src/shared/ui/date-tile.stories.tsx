import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DateTile } from './date-tile'

const meta = {
  title: 'Shared/DateTile',
  component: DateTile,
  args: { date: new Date('2026-11-14T12:00:00Z'), tone: 'match' },
} satisfies Meta<typeof DateTile>

export default meta

type Story = StoryObj<typeof meta>

export const Match: Story = {}

export const Practice: Story = {
  args: { date: new Date('2026-11-11T12:00:00Z'), tone: 'practice' },
}
