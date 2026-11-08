'use client'

import type { VariantProps } from 'class-variance-authority'
import { motion } from 'motion/react'
import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/cn'

import { buttonVariants } from './button-variants'

/** Pressing gives way a little (no movement under reduced motion, see MotionProvider). */
const PRESS = { scale: 0.97 } as const
const PRESS_TRANSITION = { type: 'spring', stiffness: 460, damping: 34 } as const

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
