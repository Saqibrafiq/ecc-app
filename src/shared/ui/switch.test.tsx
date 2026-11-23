import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Switch } from './switch'

function renderSwitch(props: Partial<Parameters<typeof Switch>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <>
      <span id="label">Notifications on this device</span>
      <span id="help">Reminders and selection news</span>
      <Switch isOn={false} onChange={onChange} labelledBy="label" describedBy="help" {...props} />
    </>,
  )
  return { onChange, control: screen.getByRole('switch') }
}

describe('Switch', () => {
  it('is named and described by its texts, and reports its state', () => {
    const { control } = renderSwitch({ isOn: true })

    expect(control).toHaveAccessibleName('Notifications on this device')
    expect(control).toHaveAccessibleDescription('Reminders and selection news')
    expect(control).toBeChecked()
  })

  it('asks to turn on when off, and off when on', () => {
    const { onChange, control } = renderSwitch()
    fireEvent.click(control)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('cannot be changed while disabled or busy', () => {
    const disabled = renderSwitch({ isDisabled: true })
    expect(disabled.control).toBeDisabled()
  })

  it('says it is busy while the change is saved', () => {
    const { control } = renderSwitch({ isBusy: true })
    expect(control).toHaveAttribute('aria-busy', 'true')
    expect(control).toBeDisabled()
  })
})
