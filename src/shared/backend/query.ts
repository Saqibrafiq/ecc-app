/** Enough for a season of one collection; the app never pages through club data. */
const LIST_LIMIT = '300'

/** A Payload REST query string, e.g. `?limit=300&where[team][equals]=1` (URL-encoded). */
export function toQuery(params: Record<string, string>): string {
  return `?${new URLSearchParams({ limit: LIST_LIMIT, ...params }).toString()}`
}

/** The start of a club day (`YYYY-MM-DD`) as Payload compares dates: midnight UTC. */
export function dayStart(date: string): string {
  return `${date}T00:00:00.000Z`
}
