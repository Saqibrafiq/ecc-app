import type { LocalDate } from '@/domain/club-rules'

/** The most players a squad can hold, as a bound on what the server accepts. */
export const MAX_NO_SHOWS = 20

/**
 * Whether the captain can record who appeared (UC-19, R-14): from the match day onwards, since
 * nobody can be absent from a match that has not been played.
 */
export function canRecordNoShows(matchDate: LocalDate, today: LocalDate): boolean {
  return today >= matchDate
}

/** A player marked absent who was not selected cannot have missed the match. */
export function areSelected(noShowIds: readonly string[], selectedIds: readonly string[]): boolean {
  const selected = new Set(selectedIds)
  return noShowIds.every((id) => selected.has(id))
}
