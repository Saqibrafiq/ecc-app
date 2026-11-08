import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { NoteSheet } from './note-sheet'

const meta = {
  title: 'Shared/NoteSheet',
  component: NoteSheet,
  args: {
    open: true,
    title: 'Send back',
    description: 'The squad opens again for the captain, who sees your note.',
    closeLabel: 'Close',
    label: 'Note to the captain',
    placeholder: 'e.g. pick a wicket-keeper',
    maxLength: 500,
    requiredMessage: 'Please write a note for the captain.',
    tooLongMessage: 'Keep it under 500 characters.',
    submitLabel: 'Send back',
    cancelLabel: 'Cancel',
    onSubmit: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof NoteSheet>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Prefilled: Story = { args: { initialValue: 'Pick a wicket-keeper' } }

/** With context below the field, as for a reason for not going. */
export const WithContext: Story = {
  args: {
    title: 'Not going?',
    label: 'Reason',
    children: (
      <p className="rounded-xl bg-surface-raised p-3 text-sm text-text-muted">
        ECC league matches come first (motion 2026/03).
      </p>
    ),
  },
}
