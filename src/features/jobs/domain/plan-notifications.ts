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
import { getEventDeadline, type ScheduledEvent } from '@/features/week'

/** UC-6: the captain is asked to check in a practice from 21:00 on practice day. */
export const CHECK_IN_TIME: LocalTime = toLocalTime('21:00')
/** A tick that comes late still sends a check-in prompt, until the next evening. */
const CATCH_UP_DAYS = 1

/** A member as the jobs see them: who they are, their team, and the team they lead. */
export type JobMember = {
  userId: number
  /** `null` until the Board links the account to a player. */
  playerId: number | null
  /** The team squad the member belongs to. */
  teamId: string | null
  /** The team a captain leads. */
  captainOfTeamId: string | null
}

export type TickInput = {
  now: Date
  /** This week's matches (with their deadline day) and the practices that take place. */
  events: readonly ScheduledEvent[]
  members: readonly JobMember[]
  /** The event ids each player has answered, by player id. */
  answers: ReadonlyMap<number, ReadonlySet<string>>
  /** How many said Going, by event id. */
  going: ReadonlyMap<string, number>
  recordedPracticeIds: ReadonlySet<string>
  /** Matches whose squad has been submitted, returned or approved: their captain has acted. */
  decidedFixtureIds: ReadonlySet<string>
}

/** A notification that is due now for one member, under a key that makes sending it idempotent. */
export type DueNotification =
  | { kind: 'reminder'; key: string; userId: number; events: ScheduledEvent[] }
  | { kind: 'check-in'; key: string; userId: number; practice: ScheduledEvent; going: number }
  | { kind: 'selection'; key: string; userId: number; match: ScheduledEvent; going: number }

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

function captainsOf(input: TickInput, teamId: string): JobMember[] {
  return input.members.filter((member) => member.captainOfTeamId === teamId)
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
      captainsOf(input, practice.team.id).map((captain): DueNotification => ({
        kind: 'check-in',
        key: `check-in:${practice.id}:${String(captain.userId)}`,
        userId: captain.userId,
        practice,
        going: input.going.get(practice.id) ?? 0,
      })),
    )
}

/** UC-9: once answers for a match have closed, the captain picks the squad. */
function planSelections(input: TickInput): DueNotification[] {
  const today = getLocalDate(input.now)
  return input.events
    .filter((event) => event.kind === 'match' && !input.decidedFixtureIds.has(event.id))
    .filter((match) => match.date >= today)
    .filter((match) => input.now > getAvailabilityDeadline(match.date, match.deadlineDay))
    .flatMap((match) =>
      captainsOf(input, match.team.id).map((captain): DueNotification => ({
        kind: 'selection',
        key: `selection:${match.id}:${String(captain.userId)}`,
        userId: captain.userId,
        match,
        going: input.going.get(match.id) ?? 0,
      })),
    )
}

/**
 * Every notification due at `now` (ADR-0004): the daily reminders to answer (UC-4, R-10), the
 * captain's check-in prompt on practice evening (UC-6) and the prompt to pick the squad once answers
 * close (UC-9). A tick asks for everything due, so a late or skipped tick catches up; the keys let
 * the notification log refuse anything already sent.
 */
export function planNotifications(input: TickInput): DueNotification[] {
  return [...planReminders(input), ...planCheckIns(input), ...planSelections(input)]
}
