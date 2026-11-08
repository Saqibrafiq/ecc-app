'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/cn'

/** Pressing gives way a little (no movement under reduced motion, see MotionProvider). */
const PRESS = { scale: 0.97 } as const
const PRESS_TRANSITION = { type: 'spring', stiffness: 460, damping: 34 } as const

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold tracking-wide uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        /** The positive answer and primary actions, in the match gold. */
        primary: 'bg-accent-match text-text-on-accent hover:bg-accent-match-hover',
        /** The other answer and secondary actions. */
        outline: 'border-2 border-border-strong text-text-default hover:bg-surface-raised',
      },
      size: {
        md: 'min-h-11 px-4 text-lg',
        lg: 'min-h-13 px-5 text-xl',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = Omit<
  ComponentProps<'button'>,
  // Motion's own handlers share these names with different signatures; buttons don't use them.
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> &
  VariantProps<typeof buttonVariants>

/** A native button in the app's style, with Motion press feedback. */
export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={PRESS}
      transition={PRESS_TRANSITION}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
