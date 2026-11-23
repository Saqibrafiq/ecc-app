'use client'

import { motion } from 'motion/react'

import { cn } from '@/shared/lib/cn'

export type SwitchProps = {
  isOn: boolean
  onChange: (isOn: boolean) => void
  /** The id of the visible text that names the switch. */
  labelledBy: string
  /** The id of the text that explains it, if any. */
  describedBy?: string
  isDisabled?: boolean
  /** While the change is saved: the switch stays put and says so. */
  isBusy?: boolean
}

const SPRING = { type: 'spring', stiffness: 600, damping: 35 } as const

/** An on/off setting that takes effect at once, e.g. notifications on this device. */
export function Switch({
  isOn,
  onChange,
  labelledBy,
  describedBy,
  isDisabled = false,
  isBusy = false,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={isBusy || undefined}
      disabled={isDisabled || isBusy}
      onClick={() => {
        onChange(!isOn)
      }}
      className={cn(
        // A 44 px tall hit area around the 28 px track.
        'relative flex h-11 w-16 shrink-0 items-center rounded-full disabled:cursor-not-allowed',
        isBusy ? 'cursor-progress' : null,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-1 h-7 rounded-full border-2 transition-colors duration-150',
          isOn ? 'border-accent-match bg-accent-match' : 'border-border-strong bg-surface-raised',
          (isDisabled || isBusy) && 'opacity-60',
        )}
      />
      <motion.span
        aria-hidden="true"
        layout
        transition={SPRING}
        className={cn(
          'relative mx-2 size-5 rounded-full',
          isOn ? 'ml-auto bg-text-on-accent' : 'bg-text-muted',
        )}
      />
    </button>
  )
}
