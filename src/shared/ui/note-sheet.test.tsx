import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NoteSheet, type NoteSheetProps } from './note-sheet'

function renderSheet(overrides: Partial<NoteSheetProps> = {}) {
  const props: NoteSheetProps = {
    open: true,
    title: 'Send back',
    description: 'The captain sees your note.',
    closeLabel: 'Close',
    label: 'Note',
    placeholder: 'e.g. pick a keeper',
    maxLength: 10,
    requiredMessage: 'Please write a note.',
    tooLongMessage: 'Too long.',
    submitLabel: 'Send',
    cancelLabel: 'Cancel',
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<NoteSheet {...props} />)
  return props
}

describe('NoteSheet', () => {
  it('asks for a note and sends it trimmed', async () => {
    const props = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please write a note.')
    expect(screen.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true')

    await userEvent.type(screen.getByLabelText('Note'), '  Keeper ')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(props.onSubmit).toHaveBeenCalledWith('Keeper')
  })

  it('refuses a note over the limit', async () => {
    const props = renderSheet({ initialValue: 'x'.repeat(11) })

    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Too long.')
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('closes on cancel and on Escape, and shows extra context', async () => {
    const props = renderSheet({ children: <p>Motion 2026/03</p> })
    expect(screen.getByText('Motion 2026/03')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.keyboard('{Escape}')

    expect(props.onClose).toHaveBeenCalledTimes(2)
  })
})
