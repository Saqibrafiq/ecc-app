import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'

import type { WeekDay } from '../types'
import { toDisplayDate } from '@/shared/lib/display-date'

export type WeekStripProps = {
  days: readonly WeekDay[]
}

/** Monday to Sunday at a glance: today in gold, the own team's practice and match days marked. */
export function WeekStrip({ days }: WeekStripProps) {
  const t = useTranslations('week')
  const format = useFormatter()

  return (
    <ol aria-label={t('days')} className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const date = toDisplayDate(day.date)
        const hasMatch = day.markers.includes('match')
        const hasPractice = day.markers.includes('practice')
        return (
          <li
            key={day.date}
            aria-current={day.isToday ? 'date' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl border py-2',
              day.isToday
                ? 'border-accent-match bg-accent-match text-text-on-accent'
                : 'border-transparent bg-surface-raised',
              !day.isToday && hasMatch && 'border-accent-match',
            )}
          >
            <span className={cn('text-xs font-semibold', day.isToday ? '' : 'text-text-muted')}>
              {format.dateTime(date, { weekday: 'short' })}
            </span>
            <span className="font-display text-2xl leading-none font-bold tabular-nums">
              {format.dateTime(date, { day: 'numeric' })}
            </span>
            <span className="h-4 font-display text-xs leading-4 font-bold tracking-wide uppercase">
              {day.isToday && t('today')}
              {!day.isToday && hasMatch && (
                <span className="text-accent-match">{t('marker.match')}</span>
              )}
              {!day.isToday && !hasMatch && hasPractice && (
                <span className="text-accent-practice">{t('marker.practice')}</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
