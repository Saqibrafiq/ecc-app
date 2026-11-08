'use client'

import { Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

import type { Answer, WeekEvent } from '../types'
import { toDisplayDate } from './dates'

export type EventCardProps = {
  event: WeekEvent
  answer: Answer | null
  reason: string | null
  /** Why the last answer was not saved, if it was not. */
  error?: string
  /** For a practice: the day of the match it prepares for, e.g. "Saturday". */
  forMatchDay?: string
  onGoing: () => void
  onNotGoing: () => void
}

const T20_OVERS = 20
const POP = { type: 'spring', stiffness: 500, damping: 30 } as const

/** A match or practice of the member's own team, with its deadline and the Going / Not going answer. */
export function EventCard({
  event,
  answer,
  reason,
  error,
  forMatchDay,
  onGoing,
  onNotGoing,
}: EventCardProps) {
  const t = useTranslations('week.event')
  const formatOvers = (overs: number) =>
    overs === T20_OVERS ? t('format.t20') : t('format.overs', { overs })
  const tButton = useTranslations('button')
  const format = useFormatter()
  const date = toDisplayDate(event.date)
  const isMatch = event.kind === 'match'
  const headingId = `event-${event.id}`

  const heading = isMatch
    ? [t('match'), event.competition, event.overs && formatOvers(event.overs)]
        .filter(Boolean)
        .join(' · ')
    : [t('practice'), forMatchDay && t('forMatch', { day: forMatchDay })]
        .filter(Boolean)
        .join(' · ')
  const closesAt = format.dateTime(new Date(event.closesAt), {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    // The club works in 24-hour time, in English too.
    hourCycle: 'h23',
  })
  const title = isMatch
    ? t('versus', { opponent: event.opponent ?? '' })
    : t('practiceTitle', { team: event.team.name })
  const place = isMatch ? `${event.isHome ? t('home') : t('away')}, ${event.ground}` : event.ground

  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-border-default bg-surface-card"
    >
      <div className="flex items-center justify-between gap-3 bg-surface-raised px-4 py-2.5">
        <span className="font-display text-sm font-bold tracking-wider uppercase">{heading}</span>
        <span
          className={cn(
            'shrink-0 text-xs font-semibold',
            !event.isOpen && 'text-text-muted',
            event.isOpen && (isMatch ? 'text-accent-match' : 'text-accent-practice'),
          )}
        >
          {event.isOpen ? t('answerBy', { when: closesAt }) : t('closed')}
        </span>
      </div>

      <div className="grid grid-cols-[4rem_1fr] items-center gap-4 px-4 py-4">
        <div className="flex flex-col items-center border-r border-border-default pr-3">
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
            {format.dateTime(date, { weekday: 'short' })}
          </span>
          <span
            className={cn(
              'font-display text-5xl leading-none font-bold tabular-nums',
              isMatch ? 'text-accent-match' : 'text-accent-practice',
            )}
          >
            {format.dateTime(date, { day: 'numeric' })}
          </span>
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
            {format.dateTime(date, { month: 'short' })}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={headingId}
            className="font-display text-2xl leading-none font-bold text-balance uppercase"
          >
            {title}
          </h2>
          <span className="text-sm text-text-muted">
            {[event.startTime, place].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-dashed border-border-default px-4 pt-3 pb-4">
        <div role="group" aria-label={t('yourAnswer')} className="grid grid-cols-2 gap-2.5">
          <Button
            size="lg"
            variant={answer === 'not-going' ? 'outline' : 'primary'}
            aria-pressed={answer === 'going'}
            disabled={!event.isOpen}
            onClick={onGoing}
          >
            <AnimatePresence initial={false}>
              {answer === 'going' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: POP }}
                  exit={{ scale: 0 }}
                  className="inline-flex"
                >
                  <Check aria-hidden="true" className="size-5" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            {tButton('going')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            aria-pressed={answer === 'not-going'}
            disabled={!event.isOpen}
            onClick={onNotGoing}
            className={cn(
              answer === 'not-going' &&
                'border-status-missed-text bg-status-missed-surface text-status-missed-text hover:bg-status-missed-surface',
            )}
          >
            <AnimatePresence initial={false}>
              {answer === 'not-going' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: POP }}
                  exit={{ scale: 0 }}
                  className="inline-flex"
                >
                  <X aria-hidden="true" className="size-5" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            {tButton('notGoing')}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-status-missed-text">
            {error}
          </p>
        )}
        <AnimatePresence initial={false}>
          {answer === 'not-going' && reason && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden text-sm text-text-muted"
            >
              “{reason}”
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </article>
  )
}
