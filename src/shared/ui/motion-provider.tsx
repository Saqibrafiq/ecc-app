'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

export type MotionProviderProps = {
  children: ReactNode
}

/**
 * Follows the member's "reduce motion" setting for every Motion animation: movement is switched
 * off and only fades remain. One place for the whole app (arc42 §8.5).
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
