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

const CAPTAIN = { teamId: 1, token: 'jwt', isAdmin: false }
const ADMIN = { teamId: null, token: 'jwt', isAdmin: true }
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

    const week = await getBackendTeamWeek(CAPTAIN, null, NOW)

    expect(week.team).toEqual({ id: '1', name: 'ECC I' })
    expect(week.choices).toEqual([])
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

    const week = await getBackendTeamWeek(CAPTAIN, null, new Date('2026-11-10T09:00:00Z'))

    expect(week.practices[0]?.canCheckIn).toBe(false)
  })

  it('names a team it does not know by its id, and reads no squads without matches', async () => {
    backend()
    const week = await getBackendTeamWeek({ ...CAPTAIN, teamId: 72 }, null, NOW)

    expect(week).toMatchObject({ team: { id: '72', name: '' }, practices: [], matches: [] })
    expect(calls().some((call) => call.path.includes('fixture%5D%5Bin'))).toBe(false)
  })
})

describe('getBackendTeamWeek for an admin', () => {
  it('shows the requested team, with every team to switch to', async () => {
    backend()

    const week = await getBackendTeamWeek(ADMIN, 14, NOW)

    expect(week.team).toEqual({ id: '14', name: 'ECC II' })
    expect(week.choices.map((team) => team.name)).toEqual(['ECC I', 'ECC II'])
    expect(week.practices).toEqual([expect.objectContaining({ practiceId: 7, isCancelled: true })])
  })

  it('falls back to the first team for an unknown or missing choice', async () => {
    backend()
    await expect(getBackendTeamWeek(ADMIN, 99, NOW)).resolves.toMatchObject({ team: { id: '1' } })

    backend()
    await expect(getBackendTeamWeek(ADMIN, null, NOW)).resolves.toMatchObject({ team: { id: '1' } })
  })
})

describe('loadCheckIn', () => {
  it('lists Going players first, with nobody ticked before the check-in', async () => {
    backend({
      answers: [
        { player: 54, response: 'going' },
        { player: 53, response: 'not-going' },
      ],
    })

    const data = await loadCheckIn(CAPTAIN, 6, NOW)

    expect(data?.checkIn).toMatchObject({ practiceId: 6, canCheckIn: true, isRecorded: false })
    expect(data?.checkIn.players.map((p) => [p.name, p.isPresent])).toEqual([
      ['Bilal Mir', false],
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

  it("lets an admin check in any team's practice", async () => {
    backend({ practice: { ...PRACTICE, team: 14 } })

    await expect(loadCheckIn(ADMIN, 6, NOW)).resolves.toMatchObject({ teamId: 14 })
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
    })
    const verdicts = data?.selection.candidates.map((c) => [c.name, c.eligibility.verdict])
    expect(verdicts).toEqual([
      ['Omar Farooq', 'selectable'],
      ['Saqib Rafiq', 'selectable'],
      ['Bilal Mir', 'not-selectable'],
    ])
    expect(data?.selection.candidates[0]?.eligibility.override).toBe('exception')
  })

  it("marks the last announced squad's 12th man and reserves, and its no-shows sit out", async () => {
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
        { player: 53, response: 'going' },
        { player: 54, response: 'not-going' },
      ],
    })

    const data = await loadSelection(CAPTAIN, 60, NOW)

    expect(data?.selection.candidates.map((c) => c.name)).not.toContain('Bilal Mir')
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
      answers: [{ player: 53, response: 'going' }],
    })

    const data = await loadSelection(CAPTAIN, 60, NOW)

    expect(data?.selection.candidates).toEqual([
      expect.objectContaining({ name: 'Ali Shaan', isCarriedOver: false }),
    ])
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

  it("lets an admin select for any team's match, with the squad's deadline and exceptions", async () => {
    backend({
      fixture: { ...FIXTURE, team2: team(14, 'ECC-II', true) },
      squads: [[{ ...SQUAD, deadlineDay: 'thursday' }]],
    })

    await expect(loadSelection(ADMIN, 60, NOW)).resolves.toMatchObject({
      deadlineDay: 'thursday',
      exceptionIds: ['55'],
    })
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
