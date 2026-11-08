import {
  CLUB_TIME_ZONE,
  getLocalDate,
  type LocalDate,
  type LocalTime,
  toInstant,
  toLocalTime,
} from './local-time'

/** R-10 / Q-8: reminders go out at 11:00 club time, from Monday, every day until answered. */
export const REMINDER_TIME: LocalTime = toLocalTime('11:00')

export type ReminderInput = {
  now: Date
  /** The first day members are asked about the event: the Monday of its week. */
  firstReminderDay: LocalDate
  /** When answers close (availability deadline for a match, practice deadline for a practice). */
  deadline: Date
  hasAnswered: boolean
  /** The day this member was last reminded about this event, if ever. */
  lastRemindedOn: LocalDate | null
}

/**
 * The day a reminder about an event is due for a member, or `null` when none is (R-10). From the
 * first reminder day on, one reminder per day once 11:00 has passed, until the member has answered
 * or answers have closed. The returned day doubles as the idempotency key: a job that runs twice
 * on the same day finds it already sent (ADR-0004).
 */
export function getDueReminderDay({
  now,
  firstReminderDay,
  deadline,
  hasAnswered,
  lastRemindedOn,
  timeZone = CLUB_TIME_ZONE,
}: ReminderInput & { timeZone?: string }): LocalDate | null {
  if (hasAnswered || now.getTime() > deadline.getTime()) return null
  const today = getLocalDate(now, timeZone)
  if (today < firstReminderDay || today === lastRemindedOn) return null
  return now.getTime() >= toInstant(today, REMINDER_TIME, timeZone).getTime() ? today : null
}
