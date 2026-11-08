import { cva } from 'class-variance-authority'

/**
 * The button look, apart from the component: a Server Component can style a link as a button
 * with it (a `'use client'` module's exports are not callable on the server).
 */
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
