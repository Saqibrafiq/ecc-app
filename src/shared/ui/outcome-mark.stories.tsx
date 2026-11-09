import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { type OutcomeKind, OutcomeMark } from './outcome-mark'

const OUTCOMES: OutcomeKind[] = ['attended', 'missed', 'upcoming', 'unrecorded', 'cancelled']

const meta = {
  title: 'Shared/OutcomeMark',
  component: OutcomeMark,
  args: { outcome: 'attended', label: 'Attended' },
  argTypes: { outcome: { control: 'inline-radio', options: OUTCOMES } },
} satisfies Meta<typeof OutcomeMark>

export default meta

type Story = StoryObj<typeof meta>

export const Attended: Story = {}

/** Every outcome, in both sizes. */
export const All: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['md', 'sm'] as const).map((size) => (
        <div key={size} className="flex gap-2">
          {OUTCOMES.map((outcome) => (
            <OutcomeMark key={outcome} outcome={outcome} label={outcome} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
}
