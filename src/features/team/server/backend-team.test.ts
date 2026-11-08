import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return { BackendError: actual.BackendError, backendRequest: request }
})

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { getBackendTeamWeek, loadCheckIn, loadSelection } = await import('./backend-team')

const CAPTAIN = { teamId: 1, token: 'jwt' }
// Wednesday 11 November 2026, 21:00 in Erlangen.
const NOW = new Date('2026-11-11T20:00:00Z')

const team = (id: number, shortName: string, isClubTeam: boolean) => ({
  id,
  name: shortName,
  shortName,
  isClubTeam,
})
const FIXTURE = {
  id: 60,
  date: '2026-11-14T12:00:00.000Z',
  startTime: '11:00',
  team1: team(2, 'NCC-I', false),
  team2: team(1, 'ECC-I', true),
  ground: { name: 'Nürnberg', clubCode: 'NCC' },
  competition: { name: 'BCV Regionalliga', maxOvers: 50 },
}
const PRACTICE = { id: 6, team: 1, date: '2026-11-11T12:00:00.000Z', startTime: '18:30' }
const PLAYERS = [
  { id: 52, name: 'Saqib Rafiq', isEcc1Eligible: true },
  { id: 53, name: 'Ali Shaan', isEcc1Eligible: true },
  { id: 54, name: 'Bilal Mir', isEcc1Eligible: true },
  { id: 55, name: 'Omar Farooq', isEcc1Eligible: false },
]
const SQUAD = {
  id: 9,
  fixture: 60,
  status: 'open',
  picks: [],
  noShows: [],
  exceptions: [55],
  note: null,
}

type Backend = {
  practice?: object | 'missing'
  fixture?: object | 'missing'
  squads?: unknown[][]
  previousFixtures?: unknown[]
  previousSquad?: object | null
  records?: unknown[]
  answers?: unknown[]
  createFails?: boolean
}

type Request = { path: string; method?: string; schema: { parse: (raw: unknown) => unknown } }

/** A fake backend that answers by path; repeated squad reads pop in order. */
function backend({
  practice = PRACTICE,
  fixture = FIXTURE,
  squads = [[SQUAD]],
  previousFixtures = [],
  previousSquad = null,
  records = [],
  answers = [],
  createFails = false,
}: Backend = {}) {
  const squadReads = [...squads]
  request.mockImplementation(({ path, method = 'GET', schema }: Request) => {
    // Like the real client, a response goes through the caller's schema.
    const respond = (value: unknown) => Promise.resolve(schema.parse(value))
    const missing = () => Promise.reject(new BackendError(404, 'Not Found'))
    if (method === 'POST') {
      return createFails ? Promise.reject(new BackendError(400, 'invalid')) : respond({})
    }
    if (path.startsWith('/practice-sessions/'))
      return practice === 'missing' ? missing() : respond(practice)
    if (path.startsWith('/fixtures/')) return fixture === 'missing' ? missing() : respond(fixture)
    if (path.startsWith('/fixtures') && path.includes('sort=-date')) {
      return respond({ docs: previousFixtures })
    }
    if (path.startsWith('/fixtures')) return respond({ docs: [FIXTURE] })
    if (path.startsWith('/teams')) {
      return respond({
        docs: [
          { id: 1, shortName: 'ECC-I' },
          { id: 14, shortName: 'ECC-II' },
        ],
      })
    }
    if (path.startsWith('/practice-sessions') && path.includes('team%5D%5Bequals')) {
      return respond({
        docs: [
          { id: 3, team: 1, date: '2026-10-21T12:00:00.000Z', isRecorded: true },
          { id: 4, team: 1, date: '2026-10-28T12:00:00.000Z', isRecorded: true },
          { id: 5, team: 1, date: '2026-11-04T12:00:00.000Z', isRecorded: true },
          { ...PRACTICE, isRecorded: true },
        ],
      })
    }
    if (path.startsWith('/practice-sessions')) {
      return respond({
        docs: [PRACTICE, { id: 7, team: 14, date: '2026-11-12T12:00:00.000Z', isCancelled: true }],
      })
    }
    if (path.startsWith('/squads') && path.includes('fixture%5D%5Bin')) {
      return respond({ docs: [{ fixture: 60, status: 'submitted' }] })
    }
    if (path.startsWith('/squads') && path.includes('%5Bequals%5D=59')) {
      return respond({ docs: previousSquad ? [previousSquad] : [] })
    }
    if (path.startsWith('/squads')) return respond({ docs: squadReads.shift() ?? [] })
    if (path.startsWith('/players')) return respond({ docs: PLAYERS })
    if (path.startsWith('/availability-responses')) return respond({ docs: answers })
    if (path.startsWith('/attendance') && path.includes('practice%5D%5Bequals')) {
      return respond({ docs: records })
    }
    if (path.startsWith('/attendance')) {
      return respond({
        docs: [52, 53, 55].flatMap((player) => [
          { player, practice: 4 },
          { player, practice: 5 },
        ]),
      })
    }
    throw new Error(`unexpected ${method} ${path}`)
  })
}

const calls = () =>
  request.mock.calls.map(([options]) => options as { path: string; method?: string })

beforeEach(() => {
  request.mockReset()
})

describe('getBackendTeamWeek', () => {
  it("lists the captain's practices with their check-in and matches with their squad", async () => {
    backend()

    const week = await getBackendTeamWeek(CAPTAIN, NOW)

    expect(week.team).toEqual({ id: '1', name: 'ECC I' })
    expect(week.practices).toEqual([
      expect.objectContaining({
        practiceId: 6,
        isRecorded: false,
        isCancelled: false,
        canCheckIn: true,
      }),
    ])
    expect(week.matches).toEqual([
      expect.objectContaining({ fixtureId: 60, squadStatus: 'submitted' }),
    ])
  })

  it('opens the check-in only on the practice day, and treats a match without squad as open', async () => {
    backend()
    request.mockImplementationOnce(() => Promise.resolve({ docs: [] }))

    const week = await getBackendTeamWeek(CAPTAIN, new Date('2026-11-10T09:00:00Z'))

    expect(week.practices[0]?.canCheckIn).toBe(false)
  })

  it('names a team it does not know by its id, and reads no squads without matches', async () => {
    backend()
    const week = await getBackendTeamWeek({ ...CAPTAIN, teamId: 72 }, NOW)

    expect(week).toMatchObject({ team: { id: '72', name: '' }, practices: [], matches: [] })
    expect(calls().some((call) => call.path.includes('fixture%5D%5Bin'))).toBe(false)
  })
})

describe('loadCheckIn', () => {
  it('ticks who said Going before the first check-in, Going players first', async () => {
    backend({
      answers: [
        { player: 54, response: 'going' },
        { player: 53, response: 'not-going' },
      ],
    })

    const data = await loadCheckIn(CAPTAIN, 6, NOW)

    expect(data?.checkIn).toMatchObject({ practiceId: 6, canCheckIn: true, isRecorded: false })
    expect(data?.checkIn.players.map((p) => [p.name, p.isPresent])).toEqual([
      ['Bilal Mir', true],
      ['Saqib Rafiq', false],
      ['Ali Shaan', false],
      ['Omar Farooq', false],
    ])
  })

  it('shows the recorded attendance and reads walk-ins from other squads by id', async () => {
    backend({
      practice: { ...PRACTICE, isRecorded: true, isCancelled: true },
      records: [{ id: 1, player: 90, attended: true }],
    })

    const data = await loadCheckIn(CAPTAIN, 6, NOW)

    expect(data?.checkIn).toMatchObject({ isRecorded: true, isCancelled: true, canCheckIn: false })
    expect(data?.records).toEqual([{ id: 1, playerId: '90', attended: true }])
    expect(calls().find((call) => call.path.startsWith('/players'))?.path).toContain(
      'id%5D%5Bin%5D=90',
    )
  })

  it("has nothing for another team's practice or a missing one", async () => {
    backend({ practice: { ...PRACTICE, team: 14 } })
    await expect(loadCheckIn(CAPTAIN, 7, NOW)).resolves.toBeNull()

    backend({ practice: 'missing' })
    await expect(loadCheckIn(CAPTAIN, 999, NOW)).resolves.toBeNull()
  })

  it('lets other failures reach the error boundary', async () => {
    request.mockRejectedValue(new BackendError(500, 'down'))

    await expect(loadCheckIn(CAPTAIN, 6, NOW)).rejects.toThrow('down')
  })
})

describe('loadSelection', () => {
  it('builds the candidates from the Going answers, with their eligibility', async () => {
    backend({
      answers: [
        { player: 52, response: 'going' },
        { player: 54, response: 'going' },
        { player: 55, response: 'going' },
        { player: 53, response: 'not-going' },
      ],
    })

    const data = await loadSelection(CAPTAIN, 60, NOW)

    expect(data?.squadId).toBe(9)
    expect(data?.selection).toMatchObject({
      fixtureId: 60,
      status: 'open',
      notGoing: 1,
      awaiting: 0,
      picks: [],
      forfeited: [],
    })
    const verdicts = data?.selection.candidates.map((c) => [c.name, c.eligibility.verdict])
    expect(verdicts).toEqual([
      ['Omar Farooq', 'selectable'],
      ['Saqib Rafiq', 'selectable'],
      ['Bilal Mir', 'not-selectable'],
    ])
    expect(data?.selection.candidates[0]?.eligibility.override).toBe('exception')
  })

  it("carries over the last announced squad's 12th man and reserves, and its no-shows sit out", async () => {
    backend({
      previousFixtures: [{ id: 59 }],
      previousSquad: {
        ...SQUAD,
        id: 8,
        fixture: 59,
        status: 'approved',
        picks: [
          { player: 52, role: 'playing' },
          { player: 53, role: 'twelfth' },
          { player: { id: 54 }, role: 'reserve' },
        ],
        noShows: [52],
      },
      squads: [[{ ...SQUAD, note: 'Check the openers', picks: [{ player: 55, role: 'playing' }] }]],
      answers: [
        { player: 52, response: 'going' },
        { player: 54, response: 'not-going' },
      ],
    })

    const data = await loadSelection(CAPTAIN, 60, NOW)

    expect(data?.carryOvers).toEqual(['53', '54'])
    expect(data?.selection.forfeited).toEqual([{ id: '54', name: 'Bilal Mir' }])
    expect(data?.selection.note).toBe('Check the openers')
    expect(data?.selection.picks).toEqual([{ playerId: '55', role: 'playing' }])
    const byName = new Map(data?.selection.candidates.map((c) => [c.name, c]))
    expect(byName.get('Ali Shaan')?.isCarriedOver).toBe(true)
    expect(byName.get('Saqib Rafiq')?.eligibility.reasons).toContain('no-show')
  })

  it('ignores a previous squad that was never announced', async () => {
    backend({
      previousFixtures: [{ id: 59 }],
      previousSquad: { ...SQUAD, fixture: 59, picks: [{ player: 53, role: 'twelfth' }] },
    })

    await expect(loadSelection(CAPTAIN, 60, NOW)).resolves.toMatchObject({ carryOvers: [] })
  })

  it('creates a missing squad as the service account and reads it back', async () => {
    backend({ squads: [[], [SQUAD]] })

    await expect(loadSelection(CAPTAIN, 60, NOW)).resolves.toMatchObject({ squadId: 9 })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/squads',
        auth: { as: 'service' },
        body: { fixture: 60 },
      }),
    )
  })

  it('fails with the reason when the squad can neither be created nor read', async () => {
    backend({ squads: [[], []], createFails: true })

    const error = await loadSelection(CAPTAIN, 60, NOW).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('could not be created or read')
    expect((error as Error).cause).toBeInstanceOf(BackendError)
  })

  it("has nothing for another team's match, a fixture without the club, or a missing one", async () => {
    backend({ fixture: { ...FIXTURE, team2: team(14, 'ECC-II', true) } })
    await expect(loadSelection(CAPTAIN, 60, NOW)).resolves.toBeNull()

    backend({ fixture: { ...FIXTURE, team2: team(3, 'TSV', false) } })
    await expect(loadSelection(CAPTAIN, 60, NOW)).resolves.toBeNull()

    backend({ fixture: 'missing' })
    await expect(loadSelection(CAPTAIN, 60, NOW)).resolves.toBeNull()
  })
})
