'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import type { Answer, MemberAnswer, SaveAnswer, WeekEvent } from '../types'
import { AnswersBanner } from './answers-banner'
import { toDisplayDate } from '@/shared/lib/display-date'
import { EventCard } from './event-card'
import { ReasonSheet } from './reason-sheet'

export type OwnWeekProps = {
  events: readonly WeekEvent[]
  /** Saves on the server; without it (the preview) answers stay in the page. */
  saveAnswer?: SaveAnswer
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
 * open. An answer shows at once; if the server refuses it, the card returns to the earlier answer
 * and says why. "Not going" asks for the reason first.
 */
export function OwnWeek({ events, saveAnswer }: OwnWeekProps) {
  const t = useTranslations('week.banner')
  const tState = useTranslations('weekState')
  const format = useFormatter()
  const [answers, setAnswers] = useState(() => initialAnswers(events))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reasonFor, setReasonFor] = useState<WeekEvent | null>(null)
  const [, startSaving] = useTransition()

  const save = (eventId: string, answer: Answer, reason: string | null) => {
    const previous = answers[eventId]
    setAnswers((current) => ({ ...current, [eventId]: { answer, reason } }))
    setErrors(({ [eventId]: _cleared, ...rest }) => rest)
    if (!saveAnswer) return

    startSaving(async () => {
      const { status } = await saveAnswer({ eventId, answer, reason })
      if (status === 'saved') return
      setAnswers(({ [eventId]: _failed, ...rest }) =>
        previous ? { ...rest, [eventId]: previous } : rest,
      )
      setErrors((current) => ({
        ...current,
        [eventId]: status === 'closed' ? tState('closed') : tState('saveFailed'),
      }))
    })
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
          error={errors[event.id]}
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
