import {
  addDays,
  CLUB_TIME_ZONE,
  daysBetween,
  endOfLocalDay,
  type LocalDate,
  type LocalTime,
  startOfWeek,
  toInstant,
} from './local-time'

/** R-5: the day availability for a match closes, unless the admin extends it. */
export type DeadlineDay = 'tuesday' | 'wednesday' | 'thursday'

export const DEFAULT_DEADLINE_DAY: DeadlineDay = 'tuesday'

/** R-5: teams are announced on Thursday, after the week's practice. */
const SELECTION_DAY: DeadlineDay = 'thursday'

const DAYS_AFTER_MONDAY: Record<DeadlineDay, number> = { tuesday: 1, wednesday: 2, thursday: 3 }

/** The end of `day` in the match's week, but never later than the end of the day before the match. */
function endOfDayInMatchWeek(matchDate: LocalDate, day: DeadlineDay, timeZone: string): Date {
  const closingDay = addDays(startOfWeek(matchDate), DAYS_AFTER_MONDAY[day])
  const lastDay = daysBetween(closingDay, matchDate) > 0 ? closingDay : addDays(matchDate, -1)
  return endOfLocalDay(lastDay, timeZone)
}

/**
 * When members' answers for a match close (R-5): the end of Tuesday of the match's week, or of
 * Wednesday or Thursday when the admin extended it. For a match early in the week, never later
 * than the end of the day before the match.
 */
export function getAvailabilityDeadline(
  matchDate: LocalDate,
  deadlineDay: DeadlineDay = DEFAULT_DEADLINE_DAY,
  timeZone: string = CLUB_TIME_ZONE,
): Date {
  return endOfDayInMatchWeek(matchDate, deadlineDay, timeZone)
}

/**
 * When the squad for a match must be selected, approved and announced (R-5): the end of Thursday
 * of the match's week, after that week's practice. For a match early in the week, never later than
 * the end of the day before the match.
 */
export function getSelectionDeadline(
  matchDate: LocalDate,
  timeZone: string = CLUB_TIME_ZONE,
): Date {
  return endOfDayInMatchWeek(matchDate, SELECTION_DAY, timeZone)
}

/** Q-10: answers for a practice close this long before it starts, so the captain can plan. */
export const PRACTICE_ANSWER_LEAD_HOURS = 12

const MS_PER_HOUR = 3_600_000

/** When answers for a practice close: 12 hours before it starts, e.g. 06:30 for 18:30 (Q-10). */
export function getPracticeDeadline(
  practiceDate: LocalDate,
  startTime: LocalTime,
  timeZone: string = CLUB_TIME_ZONE,
): Date {
  const start = toInstant(practiceDate, startTime, timeZone)
  return new Date(start.getTime() - PRACTICE_ANSWER_LEAD_HOURS * MS_PER_HOUR)
}

/** Whether answers are still accepted at `now`. The deadline itself still counts. */
export function isOpen(now: Date, deadline: Date): boolean {
  return now.getTime() <= deadline.getTime()
}
