import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

import { BottomSheet } from './bottom-sheet'
import { Button } from './button'

function SheetDemo({ initiallyOpen }: { initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true)
        }}
      >
        Open sheet
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Not going?"
        description="Tell your captain why. Only you, your captain and the Board see it."
        closeLabel="Close"
      >
        <p className="text-sm text-text-muted">The content of the sheet goes here.</p>
      </BottomSheet>
    </>
  )
}

const meta = {
  title: 'Shared/BottomSheet',
  component: SheetDemo,
  args: { initiallyOpen: true },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SheetDemo>

export default meta

type Story = StoryObj<typeof meta>

/** Slides up from the bottom; Escape, the backdrop and the close button close it. */
export const Open: Story = {}

export const Closed: Story = { args: { initiallyOpen: false } }
