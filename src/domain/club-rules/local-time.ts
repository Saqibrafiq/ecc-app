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
const UTC_OFFSET_NAME = 'GMT'
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

/** The local day (in `timeZone`) on which `instant` falls. */
export function getLocalDate(instant: Date, timeZone: string = CLUB_TIME_ZONE): LocalDate {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant) as LocalDate
}

/** The zone's offset from UTC at `instant`, in minutes ("GMT+02:00" → 120, "GMT" → 0). */
function getOffsetMinutes(instant: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .filter((part) => part.type === 'timeZoneName')
    .map((part) => part.value)
    .join('')
  if (name === UTC_OFFSET_NAME) return 0
  // "GMT+02:00": sign at 3, hours at 4–5, minutes at 7–8.
  const offset = Number(name.slice(4, 6)) * MINUTES_PER_HOUR + Number(name.slice(7, 9))
  return name[3] === '-' ? -offset : offset
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
