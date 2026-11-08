/** The club's time zone: every club rule is defined in local time (arc42 §8.1). */
export const CLUB_TIME_ZONE = 'Europe/Berlin'

/** A calendar day in club-local time, `YYYY-MM-DD`. */
export type LocalDate = string & { readonly __brand: 'LocalDate' }

/** A time of day in club-local time, `HH:mm` (24-hour). */
export type LocalTime = string & { readonly __brand: 'LocalTime' }

export type Weekday =
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60_000
const MS_PER_DAY = 86_400_000
const MINUTES_PER_HOUR = 60
const DAYS_PER_WEEK = 7
const MIDNIGHT = '00:00' as LocalTime
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })

/** Midnight UTC of a local day: only used for calendar arithmetic, never as a real instant. */
function toUtcMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

function fromUtcMidnight(ms: number): LocalDate {
  return new Date(ms).toISOString().slice(0, 10) as LocalDate
}

/** Whether `value` is a real calendar day written as `YYYY-MM-DD` (no 30 February). */
export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) return false
  const ms = toUtcMidnight(value)
  // An impossible day either fails to parse or rolls over into the next month.
  return !Number.isNaN(ms) && fromUtcMidnight(ms) === value
}

/** Whether `value` is a time of day written as `HH:mm`. */
export function isLocalTime(value: string): value is LocalTime {
  return LOCAL_TIME_PATTERN.test(value)
}

/** Parses a `YYYY-MM-DD` day, failing fast on anything else. */
export function toLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) throw new RangeError(`Not a calendar day: "${value}"`)
  return value
}

/** Parses an `HH:mm` time, failing fast on anything else. */
export function toLocalTime(value: string): LocalTime {
  if (!isLocalTime(value)) throw new RangeError(`Not a time of day: "${value}"`)
  return value
}

/** The day `days` after `date` (negative: before). Calendar days, unaffected by clock changes. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return fromUtcMidnight(toUtcMidnight(date) + days * MS_PER_DAY)
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY)
}

/** The weekday of a local day. */
export function getWeekday(date: LocalDate): Weekday {
  // The day is read at midnight UTC, so the weekday is formatted in UTC as well.
  return WEEKDAY_FORMAT.format(toUtcMidnight(date)).toLowerCase() as Weekday
}

/** The Monday of the week `date` is in: the club's week runs Monday to Sunday. */
export function startOfWeek(date: LocalDate): LocalDate {
  const daysSinceMonday =
    (new Date(toUtcMidnight(date)).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK
  return addDays(date, -daysSinceMonday)
}

/**
 * The wall-clock reading of `instant` in `timeZone`, as numbers. Only numeric parts are read, so
 * the result does not depend on how a locale writes dates or names offsets (which has changed
 * between ICU versions, e.g. "GMT" vs "GMT+00:00" for UTC).
 */
function getWallClock(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const value: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  )
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour: Number(value.hour),
    minute: Number(value.minute),
    second: Number(value.second),
  }
}

/** The local day (in `timeZone`) on which `instant` falls. */
export function getLocalDate(instant: Date, timeZone: string = CLUB_TIME_ZONE): LocalDate {
  const { year, month, day } = getWallClock(instant, timeZone)
  return fromUtcMidnight(Date.UTC(year, month - 1, day))
}

/** The zone's offset from UTC at `instant`, in minutes (e.g. 120 for CEST, 0 for UTC). */
function getOffsetMinutes(instant: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second } = getWallClock(instant, timeZone)
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  const wholeSecond = Math.floor(instant.getTime() / MS_PER_SECOND) * MS_PER_SECOND
  return Math.round((wallClockAsUtc - wholeSecond) / MS_PER_MINUTE)
}

/**
 * The instant of a local wall-clock time, e.g. Wednesday 18:30 in Erlangen. Correct on both sides
 * of a clock change: the offset is looked up for the moment itself, not for "now".
 */
export function toInstant(
  date: LocalDate,
  time: LocalTime,
  timeZone: string = CLUB_TIME_ZONE,
): Date {
  const minutesIntoDay = Number(time.slice(0, 2)) * MINUTES_PER_HOUR + Number(time.slice(3, 5))
  const wallClockAsUtc = toUtcMidnight(date) + minutesIntoDay * MS_PER_MINUTE
  // First guess with the offset at the wall-clock time read as UTC, then correct once: the second
  // lookup lands on the right side of a clock change.
  const firstGuess =
    wallClockAsUtc - getOffsetMinutes(new Date(wallClockAsUtc), timeZone) * MS_PER_MINUTE
  return new Date(wallClockAsUtc - getOffsetMinutes(new Date(firstGuess), timeZone) * MS_PER_MINUTE)
}

/** The last millisecond of a local day, e.g. "end of Tuesday" in Erlangen (days can be 23 or 25 hours). */
export function endOfLocalDay(date: LocalDate, timeZone: string = CLUB_TIME_ZONE): Date {
  const startOfNextDay = toInstant(addDays(date, 1), MIDNIGHT, timeZone)
  return new Date(startOfNextDay.getTime() - 1)
}
