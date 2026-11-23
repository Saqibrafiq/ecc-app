import 'server-only'

import {
  addDays,
  getLocalDate,
  type LocalDate,
  startOfWeek,
  toLocalTime,
} from '@/domain/club-rules'
import type { Team } from '@/features/week'

import type { SeasonInput } from '../domain/build-season'
import type { MatchOutcome, SeasonMatch } from '../types'

/**
 * Sample season for the preview (no backend): six weekends played and three to come around the
 * preview Monday, for both ECC teams. It continues the sample week (same matches this weekend),
 * and shows every state once: wins and losses, a double-header, an abandoned match.
 */

const ECC_I: Team = { id: 'ecc-1', name: 'ECC I' }
const ECC_II: Team = { id: 'ecc-2', name: 'ECC II' }
const DAYS_PER_WEEK = 7
const SATURDAY = 5
const SUNDAY = 6

type SampleMatch = {
  team: Team
  /** Weeks from the preview week: negative before, 0 this week. */
  week: number
  day: typeof SATURDAY | typeof SUNDAY
  opponent: string
  competition: string
  isHome: boolean
  outcomes?: MatchOutcome[]
}

const won = (unit: 'runs' | 'wickets', value: number): MatchOutcome => ({
  result: 'won',
  margin: { unit, value },
  method: null,
})
const lost = (unit: 'runs' | 'wickets', value: number): MatchOutcome => ({
  result: 'lost',
  margin: { unit, value },
  method: null,
})
const ABANDONED: MatchOutcome = { result: 'abandoned', margin: null, method: null }

const LEAGUE = 'DCB-Bundesliga Südost'
const T20 = 'BCV T20 1. Verbandsliga'

const SAMPLE: readonly SampleMatch[] = [
  {
    team: ECC_I,
    week: -6,
    day: SATURDAY,
    opponent: 'CCB-I',
    competition: LEAGUE,
    isHome: false,
    outcomes: [won('wickets', 4)],
  },
  {
    team: ECC_II,
    week: -6,
    day: SUNDAY,
    opponent: 'WUC',
    competition: T20,
    isHome: true,
    outcomes: [lost('runs', 12)],
  },
  {
    team: ECC_I,
    week: -5,
    day: SATURDAY,
    opponent: 'SVL-I',
    competition: LEAGUE,
    isHome: false,
    outcomes: [won('runs', 41)],
  },
  {
    team: ECC_II,
    week: -4,
    day: SUNDAY,
    opponent: 'BATCC-I',
    competition: T20,
    isHome: true,
    outcomes: [won('wickets', 6), lost('runs', 8)],
  },
  {
    team: ECC_I,
    week: -3,
    day: SATURDAY,
    opponent: 'MCC-I',
    competition: LEAGUE,
    isHome: true,
    outcomes: [lost('wickets', 3)],
  },
  {
    team: ECC_II,
    week: -3,
    day: SATURDAY,
    opponent: 'INCC-I',
    competition: T20,
    isHome: false,
    outcomes: [ABANDONED],
  },
  {
    team: ECC_I,
    week: -2,
    day: SUNDAY,
    opponent: 'SDTCC-I',
    competition: LEAGUE,
    isHome: false,
    outcomes: [won('runs', 118)],
  },
  {
    team: ECC_II,
    week: -1,
    day: SATURDAY,
    opponent: 'NCC-II',
    competition: T20,
    isHome: false,
    outcomes: [won('runs', 33), won('wickets', 2)],
  },
  {
    team: ECC_I,
    week: 0,
    day: SATURDAY,
    opponent: 'Nürnberg CC',
    competition: LEAGUE,
    isHome: false,
  },
  { team: ECC_II, week: 0, day: SUNDAY, opponent: 'Fürth II', competition: T20, isHome: true },
  { team: ECC_I, week: 1, day: SATURDAY, opponent: 'NCC-I', competition: LEAGUE, isHome: true },
  { team: ECC_II, week: 2, day: SUNDAY, opponent: 'TSVGC', competition: T20, isHome: true },
]

function toMatches(sample: SampleMatch, index: number, monday: LocalDate): SeasonMatch[] {
  const date = addDays(monday, sample.week * DAYS_PER_WEEK + sample.day)
  const isT20 = sample.competition === T20
  const legs = sample.outcomes ?? [null]
  return legs.map((outcome, leg) => ({
    id: `sample-season-${String(index)}-${String(leg)}`,
    kind: 'match',
    team: sample.team,
    date,
    startTime: toLocalTime(leg === 0 ? '11:00' : '15:00'),
    ground: sample.isHome ? 'Erlangen ground' : sample.opponent,
    opponent: sample.opponent,
    competition: sample.competition,
    overs: isT20 ? 20 : 50,
    isHome: sample.isHome,
    outcome,
  }))
}

/** A member of ECC I, as in the sample week. */
export function getSampleSeasonInput(now: Date): SeasonInput {
  const today = getLocalDate(now)
  const monday = startOfWeek(today)
  return {
    year: Number(today.slice(0, 4)),
    today,
    ownTeam: ECC_I,
    matches: SAMPLE.flatMap((sample, index) => toMatches(sample, index, monday)),
  }
}
