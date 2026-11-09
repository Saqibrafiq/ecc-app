import { Ban, Check, Clock, HelpCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

/** How a practice went for a player, as marked everywhere in the app. */
export type OutcomeKind = 'attended' | 'missed' | 'upcoming' | 'unrecorded' | 'cancelled'

export type OutcomeMarkProps = {
  outcome: OutcomeKind
  /** Read out instead of the icon, e.g. "Attended". */
  label: string
  size?: 'md' | 'sm'
}

const STYLE: Record<OutcomeKind, string> = {
  attended: 'bg-status-attended text-text-on-accent',
  missed: 'bg-status-missed-surface text-status-missed-text',
  upcoming: 'border-2 border-dashed border-accent-practice text-accent-practice',
  unrecorded: 'border-2 border-dashed border-border-strong text-text-muted',
  cancelled: 'bg-surface-raised text-text-muted',
}

const ICON: Record<OutcomeKind, (className: string) => ReactNode> = {
  attended: (className) => <Check aria-hidden="true" className={className} strokeWidth={3} />,
  missed: (className) => <X aria-hidden="true" className={className} strokeWidth={3} />,
  upcoming: (className) => <Clock aria-hidden="true" className={className} />,
  unrecorded: (className) => <HelpCircle aria-hidden="true" className={className} />,
  cancelled: (className) => <Ban aria-hidden="true" className={className} />,
}

/** A practice's outcome as a round mark: attended, missed, to come, not recorded or cancelled. */
export function OutcomeMark({ outcome, label, size = 'md' }: OutcomeMarkProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-11' : 'size-8',
        STYLE[outcome],
      )}
    >
      {ICON[outcome](size === 'md' ? 'size-5' : 'size-4')}
      <span className="sr-only">{label}</span>
    </span>
  )
}
