import { motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'

import type { SeasonDay as SeasonDayData } from '../types'
import { FixtureLine } from './fixture-line'

export type SeasonDayProps = {
  day: SeasonDayData
  isToday: boolean
}

const NODE: Record<SeasonDayData['state'], string> = {
  played: 'size-3 bg-border-strong',
  next: 'size-4 bg-accent-match ring-4 ring-accent-match/25',
  upcoming: 'size-3 border-2 border-accent-match bg-surface-page',
}

/** A match day on the season's timeline: its date, a node on the line, and every ECC fixture. */
export function SeasonDay({ day, isToday }: SeasonDayProps) {
  const t = useTranslations('season')
  const format = useFormatter()
  const date = toDisplayDate(day.date)
  const isNext = day.state === 'next'

  return (
    <div className="flex gap-2">
      <h3 className="flex w-12 shrink-0 flex-col items-center pt-2">
        <span
          aria-hidden="true"
          className="text-xs font-bold tracking-wide text-text-muted uppercase"
        >
          {format.dateTime(date, { weekday: 'short' })}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'font-display text-3xl leading-none font-bold tabular-nums',
            day.state === 'played' ? 'text-text-muted' : 'text-accent-match',
          )}
        >
          {format.dateTime(date, { day: 'numeric' })}
        </span>
        <span className="sr-only">
          {format.dateTime(date, { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        {isNext && (
          <span className="mt-1 rounded-full bg-accent-match px-1.5 text-xs font-bold text-text-on-accent uppercase">
            {isToday ? t('today') : t('next')}
          </span>
        )}
      </h3>
      <div aria-hidden="true" className="relative flex w-4 shrink-0 justify-center">
        <span className="absolute inset-y-0 w-px bg-border-default" />
        <motion.span
          initial={isNext ? { scale: 0.4 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className={cn('relative mt-4 rounded-full', NODE[day.state])}
        />
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2 pb-4">
        {day.fixtures.map((fixture) => (
          <FixtureLine key={fixture.id} fixture={fixture} isNext={isNext} />
        ))}
      </ul>
    </div>
  )
}
