import { describe, expect, it } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'

import type { MatchOutcome, SeasonMatch } from '../types'
import { buildSeason, type SeasonInput } from './build-season'

const ECC_I = { id: '1', name: 'ECC I' }
const ECC_II = { id: '14', name: 'ECC II' }
const WON: MatchOutcome = { result: 'won', margin: { unit: 'runs', value: 32 }, method: null }
const LOST: MatchOutcome = { result: 'lost', margin: { unit: 'wickets', value: 4 }, method: null }

let nextId = 0
function match(overrides: Partial<SeasonMatch> = {}): SeasonMatch {
  nextId += 1
  return {
    id: `fixture-${String(nextId)}`,
    kind: 'match',
    team: ECC_I,
    date: day('2026-11-14'),
    startTime: time('11:00'),
    ground: 'Nürnberg',
    opponent: 'NCC-I',
    competition: 'BCV Regionalliga Bayern',
    overs: 50,
    isHome: false,
    outcome: null,
    ...overrides,
  }
}

function build(matches: SeasonMatch[], overrides: Partial<SeasonInput> = {}) {
  return buildSeason({
    year: 2026,
    today: day('2026-11-09'),
    ownTeam: ECC_I,
    matches,
    ...overrides,
  })
}

describe('buildSeason', () => {
  it('groups the match days by month, in date order', () => {
    const season = build([
      match({ date: day('2026-11-21') }),
      match({ date: day('2026-04-11'), outcome: WON }),
      match({ date: day('2026-11-14') }),
    ])

    expect(season.months.map((month) => month.month)).toEqual(['2026-04-01', '2026-11-01'])
    expect(season.months[1]?.days.map((matchDay) => matchDay.date)).toEqual([
      '2026-11-14',
      '2026-11-21',
    ])
  })

  it('marks played days, the next match day and the days after it', () => {
    const season = build([
      match({ date: day('2026-11-08'), outcome: WON }),
      match({ date: day('2026-11-14') }),
      match({ date: day('2026-11-21') }),
    ])

    expect(season.months[0]?.days.map((matchDay) => matchDay.state)).toEqual([
      'played',
      'next',
      'upcoming',
    ])
    expect(season.nextDate).toBe('2026-11-14')
  })

  it('keeps a match day today as the next one until the day is over', () => {
    const season = build([match({ date: day('2026-11-14') })], { today: day('2026-11-14') })

    expect(season.months[0]?.days[0]?.state).toBe('next')
  })

  it('has no next match day once the season is over', () => {
    const season = build([match({ date: day('2026-09-06'), outcome: LOST })])

    expect(season.nextDate).toBeNull()
    expect(season.months[0]?.days[0]?.state).toBe('played')
  })

  it('folds a double-header into one fixture with both outcomes in playing order', () => {
    const twoLegs = { date: day('2026-05-10'), opponent: 'BATCC-I', competition: 'T20' }
    const season = build([
      match({ ...twoLegs, startTime: time('14:30'), outcome: LOST }),
      match({ ...twoLegs, startTime: time('10:00'), outcome: WON }),
    ])

    const fixtures = season.months[0]?.days[0]?.fixtures
    expect(fixtures).toHaveLength(1)
    expect(fixtures?.[0]?.outcomes).toEqual([WON, LOST])
    expect(fixtures?.[0]?.startTime).toBe('10:00')
  })

  it("keeps the teams' fixtures apart, the member's own team first", () => {
    const season = build(
      [
        match({ team: ECC_I, opponent: 'CCB-I' }),
        match({ team: ECC_II, opponent: 'WUC', isHome: true, overs: undefined }),
      ],
      { ownTeam: ECC_II },
    )

    const fixtures = season.months[0]?.days[0]?.fixtures ?? []
    expect(fixtures.map((fixture) => [fixture.team.name, fixture.isOwnTeam])).toEqual([
      ['ECC II', true],
      ['ECC I', false],
    ])
    expect(fixtures[0]).toMatchObject({ isHome: true, overs: null })
  })

  it('orders the teams by name for a member without a team', () => {
    const season = build([match({ team: ECC_II }), match({ team: ECC_I })], { ownTeam: null })

    expect(season.months[0]?.days[0]?.fixtures.map((fixture) => fixture.team.name)).toEqual([
      'ECC I',
      'ECC II',
    ])
    expect(season.record).toBeNull()
  })

  it("counts the own team's decided matches, without abandoned ones, and those to come", () => {
    const outcome = (result: MatchOutcome['result']): MatchOutcome => ({
      result,
      margin: null,
      method: null,
    })
    const season = build([
      match({ date: day('2026-04-11'), outcome: WON }),
      match({ date: day('2026-04-18'), outcome: LOST }),
      match({ date: day('2026-04-25'), outcome: outcome('tied') }),
      match({ date: day('2026-05-02'), outcome: outcome('abandoned') }),
      match({ date: day('2026-05-09'), outcome: outcome('cancelled') }),
      match({ date: day('2026-11-14') }),
      match({ team: ECC_II, date: day('2026-04-11'), outcome: WON }),
    ])

    expect(season.record).toEqual({ team: ECC_I, played: 3, won: 1, lost: 1, remaining: 1 })
  })

  it('reads missing match details as empty, and an empty season as no months', () => {
    const season = build([
      match({ opponent: 'SVL-I' }),
      match({ opponent: undefined, competition: undefined, isHome: undefined, startTime: null }),
    ])
    expect(season.months[0]?.days[0]?.fixtures[0]).toMatchObject({
      opponent: '',
      competition: '',
      isHome: false,
      startTime: null,
    })

    expect(build([])).toMatchObject({ months: [], nextDate: null })
  })
})
