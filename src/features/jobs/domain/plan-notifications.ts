import {
  addDays,
  getAvailabilityDeadline,
  getDueReminderDay,
  getLocalDate,
  type LocalTime,
  startOfWeek,
  toInstant,
  toLocalTime,
} from '@/domain/club-rules'
import { getEventDeadline } from '@/features/week'

import type { DueNotification, TickInput } from '../types'
import { planAttendanceWarnings } from './plan-attendance-warnings'
import { planSquadNotices } from './plan-squad-notices'
import { captainsOf } from './recipients'

/** UC-6: the captain is asked to check in a practice from 21:00 on practice day. */
export const CHECK_IN_TIME: LocalTime = toLocalTime('21:00')
/** A tick that comes late still sends a check-in prompt, until the next evening. */
const CATCH_UP_DAYS = 1

const goingCount = (input: TickInput, eventId: string) => input.going.get(eventId)?.size ?? 0

/** R-10: one reminder a day per member, listing every event of their team still to answer. */
function planReminders(input: TickInput): DueNotification[] {
  return input.members.flatMap((member): DueNotification[] => {
    if (member.playerId === null || member.teamId === null) return []
    const answered = input.answers.get(member.playerId) ?? new Set<string>()
    const due = input.events
      .filter((event) => event.team.id === member.teamId)
      .flatMap((event) => {
        const day = getDueReminderDay({
          now: input.now,
          firstReminderDay: startOfWeek(event.date),
          deadline: getEventDeadline(event),
          hasAnswered: answered.has(event.id),
          // The notification log keeps it to one a day: the key carries the day.
          lastRemindedOn: null,
        })
        return day === null ? [] : [{ event, day }]
      })
    const [first] = due
    if (!first) return []
    return [
      {
        kind: 'reminder',
        key: `reminder:${first.day}:${String(member.userId)}`,
        userId: member.userId,
        events: due.map((item) => item.event),
      },
    ]
  })
}

/** UC-6: from 21:00 on practice day, the captain checks in a practice not yet recorded. */
function planCheckIns(input: TickInput): DueNotification[] {
  return input.events
    .filter((event) => event.kind === 'practice' && !input.recordedPracticeIds.has(event.id))
    .filter((practice) => {
      const from = toInstant(practice.date, CHECK_IN_TIME)
      const until = toInstant(addDays(practice.date, CATCH_UP_DAYS), CHECK_IN_TIME)
      return input.now >= from && input.now < until
    })
    .flatMap((practice) =>
      captainsOf(input.members, practice.team.id).map((captain): DueNotification => ({
        kind: 'check-in',
        key: `check-in:${practice.id}:${String(captain.userId)}`,
        userId: captain.userId,
        practice,
        going: goingCount(input, practice.id),
      })),
    )
}

/** UC-9: once answers for a match have closed, the captain picks the squad. */
function planSelections(input: TickInput): DueNotification[] {
  const today = getLocalDate(input.now)
  // Submitted, returned or approved: the captain has acted, and the Board's steps take over.
  const decided = new Set(
    input.squads.filter((squad) => squad.status !== 'open').map((squad) => squad.matchId),
  )
  return input.events
    .filter((event) => event.kind === 'match' && !decided.has(event.id))
    .filter((match) => match.date >= today)
    .filter((match) => input.now > getAvailabilityDeadline(match.date, match.deadlineDay))
    .flatMap((match) =>
      captainsOf(input.members, match.team.id).map((captain): DueNotification => ({
        kind: 'selection',
        key: `selection:${match.id}:${String(captain.userId)}`,
        userId: captain.userId,
        match,
        going: goingCount(input, match.id),
      })),
    )
}

/**
 * Every notification due at `now` (ADR-0004): the daily reminders to answer (UC-4, R-10), the
 * captain's check-in prompt on practice evening (UC-6), the prompt to pick the squad once answers
 * close (UC-9), each step of a squad to the Board, the captain or the players (UC-11, UC-12) and
 * the attendance warnings once a practice is recorded (UC-8). A tick asks for everything due, so a
 * late or skipped tick catches up; the keys let the notification log refuse anything already sent.
 */
export function planNotifications(input: TickInput): DueNotification[] {
  return [
    ...planReminders(input),
    ...planCheckIns(input),
    ...planSelections(input),
    ...planSquadNotices(input),
    ...planAttendanceWarnings(input),
  ]
}
