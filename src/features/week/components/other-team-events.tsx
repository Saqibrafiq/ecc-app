'use client'

import { HandHelping } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { cn } from '@/shared/lib/cn'

import type { SaveAnswer, WeekEvent } from '../types'
import { toDisplayDate } from './dates'

export type OtherTeamEventsProps = {
  teamName: string
  events: readonly WeekEvent[]
  /** Saves on the server; without it (the preview) the offer stays in the page. */
  saveAnswer?: SaveAnswer
}

const SWAP = { duration: 0.15 } as const

/**
 * The other team's events, smaller: the member can offer to help (UC-3). Whether they are picked
 * follows the borrowing rule (R-16, motion 2026/02).
 */
export function OtherTeamEvents({ teamName, events, saveAnswer }: OtherTeamEventsProps) {
  const t = useTranslations('week')
  const format = useFormatter()
  const [, startSaving] = useTransition()
  const [failed, setFailed] = useState<string | null>(null)
  const [helping, setHelping] = useState<ReadonlySet<string>>(
    () => new Set(events.filter((event) => event.answer === 'going').map((event) => event.id)),
  )

  if (events.length === 0) return null

  const flip = (id: string) => {
    setHelping((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Offering to help is Going; withdrawing the offer is Not going, with that as the reason.
  const toggle = (id: string) => {
    const isOffering = !helping.has(id)
    flip(id)
    setFailed(null)
    if (!saveAnswer) return
    startSaving(async () => {
      const { status } = await saveAnswer({
        eventId: id,
        answer: isOffering ? 'going' : 'not-going',
        reason: isOffering ? null : t('other.undoReason'),
      })
      if (status === 'saved') return
      flip(id)
      setFailed(status === 'closed' ? t('closed') : t('saveFailed'))
    })
  }

  return (
    <section aria-labelledby="other-team-heading" className="flex flex-col gap-2">
      <h2
        id="other-team-heading"
        className="px-1 font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
      >
        {t('other.title', { team: teamName })}
      </h2>
      {failed && (
        <p role="alert" className="px-1 text-sm font-medium text-status-missed-text">
          {failed}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {events.map((event) => {
          const date = toDisplayDate(event.date)
          const isHelping = helping.has(event.id)
          const title =
            event.kind === 'match'
              ? t('event.versus', { opponent: event.opponent ?? '' })
              : t('event.practice')
          return (
            <li
              key={event.id}
              className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-border-default bg-surface-card px-4 py-3"
            >
              <span className="flex flex-col items-center border-r border-border-default pr-2">
                <span className="text-xs font-bold text-text-muted uppercase">
                  {format.dateTime(date, { weekday: 'short' })}
                </span>
                <span className="font-display text-2xl leading-none font-bold tabular-nums">
                  {format.dateTime(date, { day: 'numeric' })}
                </span>
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-display text-lg leading-tight font-bold uppercase">
                  {title}
                </span>
                <span className="truncate text-xs text-text-muted">
                  {[event.competition, event.startTime, event.ground].filter(Boolean).join(' · ')}
                </span>
              </span>
              {event.isOpen && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={isHelping}
                  onClick={() => {
                    toggle(event.id)
                  }}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors duration-150',
                    isHelping
                      ? 'bg-status-going-surface text-status-going-text'
                      : 'text-accent-match hover:bg-surface-raised',
                  )}
                >
                  <HandHelping aria-hidden="true" className="size-4" />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isHelping ? 'helping' : 'help'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={SWAP}
                    >
                      {isHelping ? t('other.helping') : t('other.help')}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
