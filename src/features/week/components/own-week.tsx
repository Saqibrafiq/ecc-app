'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import type { Answer, MemberAnswer, WeekEvent } from '../types'
import { AnswersBanner } from './answers-banner'
import { toDisplayDate } from './dates'
import { EventCard } from './event-card'
import { ReasonSheet } from './reason-sheet'

export type OwnWeekProps = {
  events: readonly WeekEvent[]
  /** Saves an answer; the preview keeps it in the page only. */
  onAnswer?: (eventId: string, answer: MemberAnswer) => void
}

function initialAnswers(events: readonly WeekEvent[]): Record<string, MemberAnswer> {
  const answers: Record<string, MemberAnswer> = {}
  for (const event of events) {
    if (event.answer) answers[event.id] = { answer: event.answer, reason: event.reason }
  }
  return answers
}

/**
 * The member's own team's events with their answers, and the banner counting what is still
 * open. Answering updates the banner at once; "Not going" asks for the reason first.
 */
export function OwnWeek({ events, onAnswer }: OwnWeekProps) {
  const t = useTranslations('week.banner')
  const format = useFormatter()
  const [answers, setAnswers] = useState(() => initialAnswers(events))
  const [reasonFor, setReasonFor] = useState<WeekEvent | null>(null)

  const save = (eventId: string, answer: Answer, reason: string | null) => {
    const value = { answer, reason }
    setAnswers((current) => ({ ...current, [eventId]: value }))
    onAnswer?.(eventId, value)
  }

  const weekday = (event: WeekEvent) =>
    format.dateTime(toDisplayDate(event.date), { weekday: 'long' })
  const match = events.find((event) => event.kind === 'match')
  const open = events.filter((event) => event.isOpen && !(event.id in answers))
  const openNames = open.map((event) =>
    event.kind === 'match'
      ? t('matchOn', { day: weekday(event) })
      : t('practiceOn', { day: weekday(event) }),
  )

  return (
    <>
      <AnswersBanner count={open.length} events={openNames} />
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          answer={answers[event.id]?.answer ?? null}
          reason={answers[event.id]?.reason ?? null}
          forMatchDay={
            event.kind === 'practice' && match && match.date > event.date
              ? weekday(match)
              : undefined
          }
          onGoing={() => {
            save(event.id, 'going', null)
          }}
          onNotGoing={() => {
            setReasonFor(event)
          }}
        />
      ))}
      <ReasonSheet
        key={reasonFor?.id ?? 'closed'}
        open={reasonFor !== null}
        initialReason={(reasonFor && answers[reasonFor.id]?.reason) ?? ''}
        onSave={(reason) => {
          if (reasonFor) save(reasonFor.id, 'not-going', reason)
          setReasonFor(null)
        }}
        onClose={() => {
          setReasonFor(null)
        }}
      />
    </>
  )
}
