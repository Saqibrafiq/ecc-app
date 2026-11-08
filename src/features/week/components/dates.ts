import type { LocalDate } from '@/domain/club-rules'

/**
 * A local day as a `Date` for formatting with next-intl. Noon UTC is the same calendar day in
 * Europe/Berlin all year, so `weekday` and `day` format to the intended day.
 */
export function toDisplayDate(date: LocalDate): Date {
  return new Date(`${date}T12:00:00Z`)
}
