import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { Button } from './button'

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: { children: 'Going', onClick: fn() },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'outline'] },
    size: { control: 'inline-radio', options: ['md', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Outline: Story = { args: { variant: 'outline', children: 'Not going' } }

export const Large: Story = { args: { size: 'lg' } }

export const Disabled: Story = { args: { disabled: true } }

/** The answer pair as it appears on a match or practice card. */
export const AnswerPair: Story = {
  render: () => (
    <div className="grid w-80 grid-cols-2 gap-2.5">
      <Button size="lg">Going</Button>
      <Button size="lg" variant="outline">
        Not going
      </Button>
    </div>
  ),
}
