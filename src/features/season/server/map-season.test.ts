import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { seasonFixtureDocSchema, toSeasonMatch } = await import('./map-season')

const ECC = { id: 1, name: 'Erlangen Cricket Club I', shortName: 'ECC-I', isClubTeam: true }
const NCC = { id: 2, name: 'NCC-I', shortName: 'NCC-I', isClubTeam: false }

function doc(overrides: Record<string, unknown> = {}) {
  return seasonFixtureDocSchema.parse({
    id: 60,
    date: '2026-09-06T12:00:00.000Z',
    startTime: '11:00',
    team1: NCC,
    team2: ECC,
    ground: { name: 'Nürnberg', clubCode: 'NCC' },
    competition: { name: 'BCV T20 Regionalliga Bayern', maxOvers: 20 },
    status: 'completed',
    matchResult: null,
    ...overrides,
  })
}

const outcomeOf = (overrides: Record<string, unknown>) => toSeasonMatch(doc(overrides))?.outcome

describe('toSeasonMatch', () => {
  it("maps the fixture as the ECC team's match", () => {
    expect(toSeasonMatch(doc({ status: 'scheduled' }))).toMatchObject({
      id: 'fixture-60',
      team: { id: '1', name: 'ECC I' },
      date: '2026-09-06',
      opponent: 'NCC-I',
      isHome: false,
      outcome: null,
    })
  })

  it('reads a win and a loss from the ECC side, with the margin', () => {
    const margin = { unit: 'runs', value: 32 }
    expect(
      outcomeOf({ matchResult: { kind: 'win', winnerTeamId: 2, margin, isDls: false } }),
    ).toEqual({ result: 'lost', margin, method: null })
    expect(
      outcomeOf({ matchResult: { kind: 'win', winnerTeamId: 1, margin: null, isDls: true } }),
    ).toEqual({ result: 'won', margin: null, method: 'dls' })
  })

  it('reads ties, with or without DLS', () => {
    expect(outcomeOf({ matchResult: { kind: 'tie', isDls: false } })).toEqual({
      result: 'tied',
      margin: null,
      method: null,
    })
    expect(outcomeOf({ matchResult: { kind: 'tie', isDls: true } })?.method).toBe('dls')
  })

  it('reads awarded matches for and against the ECC team', () => {
    expect(outcomeOf({ matchResult: { kind: 'walkover', winnerTeamId: 1 } })).toEqual({
      result: 'won',
      margin: null,
      method: 'walkover',
    })
    expect(outcomeOf({ matchResult: { kind: 'forfeit', winnerTeamId: 2 } })).toEqual({
      result: 'lost',
      margin: null,
      method: 'forfeit',
    })
  })

  it('reads a no result, and abandoned or cancelled matches from the status', () => {
    expect(outcomeOf({ matchResult: { kind: 'no-result' } })?.result).toBe('no-result')
    expect(outcomeOf({ status: 'abandoned' })?.result).toBe('abandoned')
    expect(outcomeOf({ status: 'cancelled' })?.result).toBe('cancelled')
  })

  it('treats a completed fixture without a derived result as still to be decided', () => {
    expect(outcomeOf({ matchResult: undefined })).toBeNull()
  })

  it('skips a fixture without an ECC team', () => {
    expect(toSeasonMatch(doc({ team2: { ...NCC, id: 3, name: 'SVL-I' } }))).toBeNull()
  })
})
