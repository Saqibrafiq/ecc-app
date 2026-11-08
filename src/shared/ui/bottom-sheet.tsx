'use client'

import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'

const SPRING = { type: 'spring', stiffness: 420, damping: 38 } as const
const EXIT = { duration: 0.18, ease: 'easeIn' } as const

export type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  closeLabel: string
  children: ReactNode
}

/**
 * A panel that slides up from the bottom edge, in thumb reach (a modal dialog for assistive
 * technology: focus is trapped, Escape and the backdrop close it). Under reduced motion it
 * appears without sliding (MotionProvider).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-surface-card/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: EXIT }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col gap-4 rounded-t-3xl border-t border-border-default bg-surface-page px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none"
                initial={{ y: '100%' }}
                animate={{ y: 0, transition: SPRING }}
                exit={{ y: '100%', transition: EXIT }}
              >
                <div
                  aria-hidden="true"
                  className="mx-auto h-1.5 w-10 rounded-full bg-border-strong"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <Dialog.Title className="font-display text-2xl leading-tight font-bold uppercase">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="text-sm text-text-muted">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label={closeLabel}
                    className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-text-default"
                  >
                    <X aria-hidden="true" className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="overflow-y-auto">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
