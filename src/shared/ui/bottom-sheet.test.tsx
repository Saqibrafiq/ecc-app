import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BottomSheet } from './bottom-sheet'

function renderSheet(open: boolean, onOpenChange = vi.fn()) {
  render(
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Not going?"
      description="Tell your captain why."
      closeLabel="Close"
    >
      <p>Content</p>
    </BottomSheet>,
  )
  return onOpenChange
}

describe('BottomSheet', () => {
  it('is a named dialog with its description while open', () => {
    renderSheet(true)

    const dialog = screen.getByRole('dialog', { name: 'Not going?' })
    expect(dialog).toHaveAccessibleDescription('Tell your captain why.')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders nothing while closed', () => {
    renderSheet(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks to close from the close button and from Escape', async () => {
    const onOpenChange = renderSheet(true)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledTimes(2)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
