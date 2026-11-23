import type { LocalDate } from '@/domain/club-rules'
import type { ScheduledEvent, Team } from '@/features/week'

/** How a match ended for the ECC team, as the website derives it from the scorecard. */
export type MatchResult = 'won' | 'lost' | 'tied' | 'no-result' | 'abandoned' | 'cancelled'

export type ResultMargin = { unit: 'runs' | 'wickets'; value: number }

export type MatchOutcome = {
  result: MatchResult
  margin: ResultMargin | null
  /** Set when the result was not decided on the field in full: by DLS or awarded. */
  method: 'dls' | 'forfeit' | 'walkover' | null
}

/** One ECC match of the season, with its outcome once it is decided (`null` until then). */
export type SeasonMatch = ScheduledEvent & { outcome: MatchOutcome | null }

/**
 * One team's fixture on a day. A T20 double-header (two matches, same day, same opponent) is
 * one fixture with two outcomes, in playing order.
 */
export type SeasonFixture = {
  id: string
  team: Team
  isOwnTeam: boolean
  opponent: string
  competition: string
  overs: number | null
  isHome: boolean
  ground: string
  startTime: ScheduledEvent['startTime']
  outcomes: (MatchOutcome | null)[]
}

/** `next` is the first match day from today on; it is where the screen opens. */
export type SeasonDayState = 'played' | 'next' | 'upcoming'

export type SeasonDay = {
  date: LocalDate
  state: SeasonDayState
  /** The member's own team first: display order only (R-7). */
  fixtures: SeasonFixture[]
}

export type SeasonMonth = {
  /** The month's first day, for its heading. */
  month: LocalDate
  days: SeasonDay[]
}

/** The member's team's season so far: decided matches, and those still to come. */
export type SeasonRecord = {
  team: Team
  played: number
  won: number
  lost: number
  remaining: number
}

export type Season = {
  year: number
  today: LocalDate
  months: SeasonMonth[]
  /** `null` once the last match of the season is behind. */
  nextDate: LocalDate | null
  /** `null` for a member without a team squad. */
  record: SeasonRecord | null
}
