import { useFormatter, useTranslations } from 'next-intl'

import { toDisplayDate } from '@/shared/lib/display-date'
import { OutcomeMark } from '@/shared/ui/outcome-mark'

import type { LedgerStanding } from '../types'

export type StandingCardProps = {
  standing: LedgerStanding
}

/** The practices that count for the next match and whether the member can be selected (R-2). */
export function StandingCard({ standing }: StandingCardProps) {
  const t = useTranslations('attendance')
  const format = useFormatter()
  const open = standing.slots.filter((s) => s.outcome === 'upcoming' || s.outcome === 'unrecorded')
  const date = standing.matchDate
    ? format.dateTime(toDisplayDate(standing.matchDate), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''

  let message = t('standing.noMatch')
  if (standing.matchDate && !standing.isRuleActive) message = t('standing.notActive')
  else if (standing.matchDate && standing.standing === 'met') message = t('standing.met', { date })
  else if (standing.matchDate && standing.standing === 'possible') {
    message = t('standing.needs', { needed: standing.stillNeeded, of: open.length, date })
  } else if (standing.matchDate) message = t('standing.out', { date })

  return (
    <section
      aria-labelledby="standing-heading"
      className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="standing-heading"
          className="font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
        >
          {t('standing.title')}
        </h2>
        <span className="font-display text-2xl font-bold text-accent-match tabular-nums">
          {t('standing.count', { attended: standing.attended, total: standing.slots.length })}
        </span>
      </div>
      {standing.slots.length > 0 && (
        <ol className="grid grid-cols-4 gap-2">
          {standing.slots.map((slot) => (
            <li key={slot.practiceId} className="flex flex-col items-center gap-1.5">
              <OutcomeMark outcome={slot.outcome} label={t(`outcome.${slot.outcome}`)} />
              <span className="text-xs text-text-muted">
                {format.dateTime(toDisplayDate(slot.date), { day: 'numeric', month: 'short' })}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-sm leading-relaxed text-text-muted">{message}</p>
    </section>
  )
}
