import { Check, Clock, HelpCircle, X } from 'lucide-react'
import { getFormatter, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { PracticeOutcome } from '@/domain/club-rules'
import { cn } from '@/shared/lib/cn'

import type { AttendanceSummary } from '../types'
import { toDisplayDate } from './dates'

export type AttendanceCardProps = {
  attendance: AttendanceSummary
  /** The day of the match these practices count for, e.g. "Saturday". */
  matchDay: string
}

const SLOT_STYLE: Record<PracticeOutcome, string> = {
  attended: 'bg-status-attended text-text-on-accent',
  missed: 'bg-status-missed-surface text-status-missed-text',
  upcoming: 'border-2 border-dashed border-accent-practice text-accent-practice',
  unrecorded: 'border-2 border-dashed border-border-strong text-text-muted',
}

const SLOT_ICON: Record<PracticeOutcome, ReactNode> = {
  attended: <Check aria-hidden="true" className="size-5" strokeWidth={3} />,
  missed: <X aria-hidden="true" className="size-5" strokeWidth={3} />,
  upcoming: <Clock aria-hidden="true" className="size-5" />,
  unrecorded: <HelpCircle aria-hidden="true" className="size-5" />,
}

/** The practices that count for the next match, and what the member still needs (R-2, R-3). */
export async function AttendanceCard({ attendance, matchDay }: AttendanceCardProps) {
  const t = await getTranslations('week.attendance')
  const format = await getFormatter()
  const { countdown } = attendance

  let message: string
  if (!attendance.isRuleActive) message = t('notActive')
  else if (countdown.kind === 'met') message = t('met', { day: matchDay })
  else if (countdown.kind === 'needs')
    message = t('needs', { needed: countdown.needed, of: countdown.of })
  else message = t('out')

  return (
    <section
      aria-labelledby="attendance-heading"
      className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="attendance-heading"
          className="font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
        >
          {t('title')}
        </h2>
        <span className="font-display text-2xl font-bold text-accent-match tabular-nums">
          {t('count', { attended: attendance.attended, total: attendance.slots.length })}
        </span>
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {attendance.slots.map((slot) => {
          const date = toDisplayDate(slot.date)
          return (
            <li key={slot.id} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-full',
                  SLOT_STYLE[slot.outcome],
                )}
              >
                {SLOT_ICON[slot.outcome]}
                <span className="sr-only">{t(`outcome.${slot.outcome}`)}</span>
              </span>
              <span
                className={cn(
                  'text-xs',
                  slot.outcome === 'upcoming'
                    ? 'font-bold text-accent-practice'
                    : 'text-text-muted',
                )}
              >
                {format.dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="text-sm leading-relaxed text-text-muted">{message}</p>
    </section>
  )
}
