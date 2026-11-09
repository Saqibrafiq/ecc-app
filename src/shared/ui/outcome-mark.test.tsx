import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OutcomeMark } from './outcome-mark'

describe('OutcomeMark', () => {
  it('reads out the outcome instead of the icon', () => {
    render(<OutcomeMark outcome="attended" label="Attended" />)

    const mark = screen.getByText('Attended').parentElement
    expect(mark).toHaveClass('size-11', 'bg-status-attended')
    expect(mark?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('has a smaller size for lists, and marks cancelled practices', () => {
    render(<OutcomeMark outcome="cancelled" label="Cancelled" size="sm" />)

    expect(screen.getByText('Cancelled').parentElement).toHaveClass('size-8', 'bg-surface-raised')
  })
})
