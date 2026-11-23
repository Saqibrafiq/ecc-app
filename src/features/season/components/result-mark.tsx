import { Ban, Check, CloudRain, Equal, Minus, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import type { MatchResult } from '../types'

export type ResultMarkProps = {
  result: MatchResult
}

const STYLE: Record<MatchResult, string> = {
  won: 'bg-status-attended text-text-on-accent',
  lost: 'bg-status-missed-surface text-status-missed-text',
  tied: 'bg-surface-raised text-text-default',
  'no-result': 'bg-surface-raised text-text-muted',
  abandoned: 'bg-surface-raised text-text-muted',
  cancelled: 'bg-surface-raised text-text-muted',
}

const ICON_CLASS = 'size-3.5'
const ICON: Record<MatchResult, ReactNode> = {
  won: <Check className={ICON_CLASS} strokeWidth={3} />,
  lost: <X className={ICON_CLASS} strokeWidth={3} />,
  tied: <Equal className={ICON_CLASS} strokeWidth={3} />,
  'no-result': <Minus className={ICON_CLASS} strokeWidth={3} />,
  abandoned: <CloudRain className={ICON_CLASS} />,
  cancelled: <Ban className={ICON_CLASS} />,
}

/** A match result as a small round mark. Decorative: the result is always written beside it. */
export function ResultMark({ result }: ResultMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', STYLE[result])}
    >
      {ICON[result]}
    </span>
  )
}
