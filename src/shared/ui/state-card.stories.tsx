import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CalendarOff, ShieldAlert } from 'lucide-react'

import { StateCard } from './state-card'

const meta = {
  title: 'Shared/StateCard',
  component: StateCard,
  args: {
    icon: <CalendarOff aria-hidden="true" className="size-5" />,
    title: 'Quiet week',
    text: 'ECC I has no match or practice this week.',
  },
} satisfies Meta<typeof StateCard>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** With a way on: a link back to the week. */
export const WithAction: Story = {
  args: {
    icon: <ShieldAlert aria-hidden="true" className="size-5" />,
    title: 'Captains only',
    text: 'Only the captain of a team can select its squad.',
    children: (
      <button
        type="button"
        className="font-semibold text-accent-match underline underline-offset-4"
      >
        Back to your week
      </button>
    ),
  },
}
