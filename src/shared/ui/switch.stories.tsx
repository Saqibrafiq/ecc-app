import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { Switch, type SwitchProps } from './switch'

function Labelled(props: Omit<SwitchProps, 'labelledBy' | 'onChange'>) {
  const [isOn, setOn] = useState(props.isOn)
  return (
    <div className="flex max-w-md items-center gap-3 rounded-2xl bg-surface-card p-4">
      <span id="switch-label" className="flex-1 font-semibold">
        Notifications on this device
      </span>
      <Switch {...props} isOn={isOn} onChange={setOn} labelledBy="switch-label" />
    </div>
  )
}

const meta = {
  title: 'Shared/Switch',
  component: Labelled,
  args: { isOn: false },
} satisfies Meta<typeof Labelled>

export default meta

type Story = StoryObj<typeof meta>

/** Tap to turn on: the thumb glides across. */
export const Off: Story = {}

export const On: Story = { args: { isOn: true } }

/** While the change is saved. */
export const Busy: Story = { args: { isOn: false, isBusy: true } }

/** Not possible on this device, e.g. blocked in its settings. */
export const Disabled: Story = { args: { isOn: false, isDisabled: true } }
