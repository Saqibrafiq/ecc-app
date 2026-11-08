import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './button'

describe('Button', () => {
  it('is a native button that reacts to presses', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Going</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Going' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not submit a form unless asked to', () => {
    render(<Button>Not going</Button>)

    expect(screen.getByRole('button', { name: 'Not going' })).toHaveAttribute('type', 'button')
  })

  it('cannot be pressed while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Going
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Going' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
