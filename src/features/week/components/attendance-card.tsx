import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'

import type { AttendanceSummary } from '../types'
import { toDisplayDate } from '@/shared/lib/display-date'
import { OutcomeMark } from '@/shared/ui/outcome-mark'

export type AttendanceCardProps = {
  attendance: AttendanceSummary
  /** The day of the match these practices count for, e.g. "Saturday". */
  matchDay: string
}

/** The practices that count for the next match, and what the member still needs (R-2, R-3). */
export function AttendanceCard({ attendance, matchDay }: AttendanceCardProps) {
  const t = useTranslations('week.attendance')
  const format = useFormatter()
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
              <OutcomeMark outcome={slot.outcome} label={t(`outcome.${slot.outcome}`)} />
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
