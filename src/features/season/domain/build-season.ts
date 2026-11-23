import type { LocalDate } from '@/domain/club-rules'
import type { Team } from '@/features/week'

import type {
  MatchResult,
  Season,
  SeasonDay,
  SeasonFixture,
  SeasonMatch,
  SeasonMonth,
  SeasonRecord,
} from '../types'

export type SeasonInput = {
  year: number
  today: LocalDate
  /** The member's team, or `null` without a team squad. */
  ownTeam: Team | null
  matches: readonly SeasonMatch[]
}

/** Results that count as a match played; abandoned and cancelled matches do not. */
const PLAYED_RESULTS: ReadonlySet<MatchResult> = new Set(['won', 'lost', 'tied', 'no-result'])
/** `YYYY-MM` of a local date. */
const MONTH_LENGTH = 7

/** A match without a start time yet sorts first on its day. */
function startOf(match: SeasonMatch): string {
  return match.startTime ?? ''
}

function byDateAndTime(a: SeasonMatch, b: SeasonMatch): number {
  return a.date.localeCompare(b.date) || startOf(a).localeCompare(startOf(b))
}

/** Same day, same team, same opponent and competition: the two legs of a double-header. */
function fixtureKey(match: SeasonMatch): string {
  return [match.date, match.team.id, match.opponent ?? '', match.competition ?? ''].join('|')
}

function toFixture(match: SeasonMatch, ownTeamId: string | null): SeasonFixture {
  return {
    id: match.id,
    team: match.team,
    isOwnTeam: match.team.id === ownTeamId,
    opponent: match.opponent ?? '',
    competition: match.competition ?? '',
    overs: match.overs ?? null,
    isHome: match.isHome === true,
    ground: match.ground,
    startTime: match.startTime,
    outcomes: [match.outcome],
  }
}

/** Own team first, then by team name, so a day always reads the same way. */
function byTeam(a: SeasonFixture, b: SeasonFixture): number {
  return Number(b.isOwnTeam) - Number(a.isOwnTeam) || a.team.name.localeCompare(b.team.name)
}

function groupDays(matches: readonly SeasonMatch[], ownTeamId: string | null) {
  const days = new Map<LocalDate, Map<string, SeasonFixture>>()
  for (const match of [...matches].sort(byDateAndTime)) {
    const fixtures = days.get(match.date) ?? new Map<string, SeasonFixture>()
    const key = fixtureKey(match)
    const existing = fixtures.get(key)
    if (existing) existing.outcomes.push(match.outcome)
    else fixtures.set(key, toFixture(match, ownTeamId))
    days.set(match.date, fixtures)
  }
  return [...days.entries()].map(([date, fixtures]) => ({
    date,
    fixtures: [...fixtures.values()].sort(byTeam),
  }))
}

function toMonths(days: readonly SeasonDay[]): SeasonMonth[] {
  const months = new Map<string, SeasonDay[]>()
  for (const day of days) {
    const key = day.date.slice(0, MONTH_LENGTH)
    months.set(key, [...(months.get(key) ?? []), day])
  }
  return [...months.entries()].map(([key, monthDays]) => ({
    month: `${key}-01` as LocalDate,
    days: monthDays,
  }))
}

function getRecord(matches: readonly SeasonMatch[], ownTeam: Team | null): SeasonRecord | null {
  if (!ownTeam) return null
  const own = matches.filter((match) => match.team.id === ownTeam.id)
  const results = own.flatMap((match) => (match.outcome ? [match.outcome.result] : []))
  return {
    team: ownTeam,
    played: results.filter((result) => PLAYED_RESULTS.has(result)).length,
    won: results.filter((result) => result === 'won').length,
    lost: results.filter((result) => result === 'lost').length,
    remaining: own.filter((match) => match.outcome === null).length,
  }
}

/**
 * The club's season as a timeline: months, their match days, and on each day every ECC team's
 * fixture. The first match day from `today` on is marked `next`; a match day today counts as next,
 * so the screen opens on it until the day is over.
 */
export function buildSeason({ year, today, ownTeam, matches }: SeasonInput): Season {
  const grouped = groupDays(matches, ownTeam?.id ?? null)
  const nextDate = grouped.find((day) => day.date >= today)?.date ?? null
  const days: SeasonDay[] = grouped.map((day) => ({
    ...day,
    state: day.date < today ? 'played' : day.date === nextDate ? 'next' : 'upcoming',
  }))

  return { year, today, months: toMonths(days), nextDate, record: getRecord(matches, ownTeam) }
}
