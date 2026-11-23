'use client'

import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { toDisplayDate } from '@/shared/lib/display-date'

import type { LocalDate } from '@/domain/club-rules'
import type { SeasonDay as SeasonDayData, SeasonMonth } from '../types'
import { SeasonDay } from './season-day'

export type SeasonTimelineProps = {
  months: readonly SeasonMonth[]
  today: LocalDate
  /** `false` once the season is over: then everything is history and shown in full. */
  hasNext: boolean
}

const TIMELINE_ID = 'season-timeline'
const TRANSITION = { duration: 0.2, ease: 'easeOut' } as const
/** Match days fold open and shut; their clipping stays off the month, which keeps it sticky. */
const FOLD = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: TRANSITION,
} as const
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: TRANSITION,
} as const

const isPlayed = (day: SeasonDayData) => day.state === 'played'

/**
 * The season's months and match days. While matches are still to come, the played part is folded
 * away, so the screen opens on the next match day by layout alone (no scrolling after load, which
 * would move the page under the member's thumb); one tap unfolds the season so far.
 */
export function SeasonTimeline({ months, today, hasNext }: SeasonTimelineProps) {
  const t = useTranslations('season')
  const format = useFormatter()
  const [isEarlierShown, setEarlierShown] = useState(!hasNext)
  const earlierMatches = months
    .flatMap((month) => month.days.filter(isPlayed))
    .reduce((count, day) => count + day.fixtures.flatMap((fixture) => fixture.outcomes).length, 0)

  return (
    <div className="flex flex-col gap-2">
      {hasNext && earlierMatches > 0 && (
        <motion.button
          type="button"
          aria-expanded={isEarlierShown}
          aria-controls={TIMELINE_ID}
          onClick={() => {
            setEarlierShown((isShown) => !isShown)
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-default text-sm font-semibold text-text-muted transition-colors duration-150 hover:text-text-default"
        >
          {isEarlierShown ? t('earlier.hide') : t('earlier.show', { count: earlierMatches })}
          <motion.span
            animate={{ rotate: isEarlierShown ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </motion.span>
        </motion.button>
      )}
      <div id={TIMELINE_ID}>
        <AnimatePresence initial={false}>
          {months.map((month) => {
            const days = month.days.filter((day) => isEarlierShown || !isPlayed(day))
            if (days.length === 0) return null
            const headingId = `season-${month.month}`
            return (
              <motion.section key={month.month} aria-labelledby={headingId} {...FADE}>
                <h2
                  id={headingId}
                  className="sticky top-0 z-10 -mx-4 bg-surface-page/95 px-4 py-2 font-display text-lg font-bold tracking-[0.15em] text-text-muted uppercase backdrop-blur"
                >
                  {format.dateTime(toDisplayDate(month.month), { month: 'long', year: 'numeric' })}
                </h2>
                <ol className="flex flex-col pt-1">
                  <AnimatePresence initial={false}>
                    {days.map((day) => (
                      <motion.li key={day.date} className="overflow-hidden" {...FOLD}>
                        <SeasonDay day={day} isToday={day.date === today} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              </motion.section>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
