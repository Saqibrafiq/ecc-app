import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: request }))

const { getBackendWeek } = await import('./backend-week')

const MEMBER = { playerId: 52, token: 'jwt' }
// Monday 9 November 2026, 10:00 in Erlangen.
const NOW = new Date('2026-11-09T09:00:00Z')

const team = (id: number, shortName: string, isClubTeam: boolean) => ({
  id,
  name: shortName,
  shortName,
  isClubTeam,
})
const FIXTURES = [
  {
    id: 12,
    date: '2026-11-14T12:00:00.000Z',
    startTime: '11:00',
    team1: team(2, 'NCC-I', false),
    team2: team(1, 'ECC-I', true),
    ground: { name: 'Nürnberg', clubCode: 'NCC' },
    competition: { name: 'BCV Regionalliga Bayern', maxOvers: 50 },
  },
  {
    id: 13,
    date: '2026-11-15T12:00:00.000Z',
    startTime: '13:00',
    team1: team(14, 'ECC-II', true),
    team2: team(3, 'TSVGC', false),
    ground: { name: 'Erlangen', clubCode: 'ECC' },
    competition: { name: 'BCV T20 1. Verbandsliga', maxOvers: 20 },
  },
]
const practice = (id: number, teamId: number, day: string, extra: object = {}) => ({
  id,
  team: teamId,
  date: `${day}T12:00:00.000Z`,
  startTime: '18:30',
  ...extra,
})

type Responses = {
  squadTeam?: number | null
  weekPractices?: unknown[][]
  answers?: unknown[]
  deadlines?: unknown[]
  nextMatch?: unknown[]
}

/** A fake backend that answers by path; repeated reads of the week's practices pop in order. */
function backend({
  squadTeam = 1,
  weekPractices = [[]],
  answers = [],
  deadlines = [],
  nextMatch = [],
}: Responses = {}) {
  const practiceReads = [...weekPractices]
  request.mockImplementation(({ path, method = 'GET' }: { path: string; method?: string }) => {
    const respond = (value: unknown) => Promise.resolve(value)
    if (method === 'POST') return respond({ doc: {} })
    if (path.startsWith('/players/')) return respond({ squadTeam })
    if (path.startsWith('/teams')) {
      return respond({
        docs: [
          { id: 1, shortName: 'ECC-I' },
          { id: 14, shortName: 'ECC-II' },
        ],
      })
    }
    if (path.startsWith('/fixtures') && path.includes('or%5D')) return respond({ docs: nextMatch })
    if (path.startsWith('/fixtures')) return respond({ docs: FIXTURES })
    if (path.startsWith('/practice-sessions') && path.includes('team%5D%5Bequals')) {
      return respond({
        docs: [
          practice(1, 1, '2026-10-21', { isRecorded: true }),
          practice(3, 1, '2026-11-04', { isRecorded: true }),
        ],
      })
    }
    if (path.startsWith('/practice-sessions')) return respond({ docs: practiceReads.shift() ?? [] })
    if (path.startsWith('/squads')) return respond({ docs: deadlines })
    if (path.startsWith('/availability-responses')) return respond({ docs: answers })
    if (path.startsWith('/attendance')) return respond({ docs: [{ practice: 1 }, { practice: 3 }] })
    throw new Error(`unexpected ${method} ${path}`)
  })
}

const posts = () =>
  request.mock.calls
    .map(([options]) => options as { method?: string; body?: unknown })
    .filter((options) => options.method === 'POST')

beforeEach(() => {
  request.mockReset()
})

describe('getBackendWeek', () => {
  it('reports a member who is not in a team squad', async () => {
    backend({ squadTeam: null })

    await expect(getBackendWeek(MEMBER, NOW)).resolves.toEqual({ kind: 'no-squad' })
  })

  it('creates the week’s practices from the weekend matches, as the service account', async () => {
    backend({
      weekPractices: [[], [practice(5, 1, '2026-11-11'), practice(6, 14, '2026-11-12')]],
    })

    const result = await getBackendWeek(MEMBER, NOW)

    expect(posts()).toEqual([
      expect.objectContaining({
        auth: { as: 'service' },
        body: { team: 1, date: '2026-11-11T12:00:00.000Z', startTime: '18:30', fixture: 12 },
      }),
      expect.objectContaining({
        body: { team: 14, date: '2026-11-12T12:00:00.000Z', startTime: '18:30', fixture: 13 },
      }),
    ])
    if (result.kind !== 'week') throw new Error('expected a week')
    expect(result.week.ownEvents.map((event) => event.id)).toEqual(['practice-5', 'fixture-12'])
    expect(result.week.otherEvents.map((event) => event.id)).toEqual(['practice-6', 'fixture-13'])
    expect(result.week.ownTeam).toEqual({ id: '1', name: 'ECC I' })
  })

  it('creates nothing when the practices already exist, and hides cancelled ones', async () => {
    backend({
      weekPractices: [
        [practice(5, 1, '2026-11-11'), practice(6, 14, '2026-11-12', { isCancelled: true })],
      ],
    })

    const result = await getBackendWeek(MEMBER, NOW)

    expect(posts()).toEqual([])
    if (result.kind !== 'week') throw new Error('expected a week')
    expect(result.week.otherEvents.map((event) => event.id)).toEqual(['fixture-13'])
  })

  it('carries the member’s answers, attendance, deadline extensions and the next match', async () => {
    backend({
      weekPractices: [[practice(5, 1, '2026-11-11'), practice(6, 14, '2026-11-12')]],
      answers: [{ id: 1, fixture: 12, practice: null, response: 'going', reason: null }],
      deadlines: [{ fixture: 12, deadlineDay: 'thursday' }],
      nextMatch: [{ ...FIXTURES[0], id: 20, date: '2026-11-21T12:00:00.000Z' }],
    })

    const result = await getBackendWeek(MEMBER, NOW)

    if (result.kind !== 'week') throw new Error('expected a week')
    const match = result.week.ownEvents.find((event) => event.id === 'fixture-12')
    expect(match).toMatchObject({ answer: 'going', closesAt: '2026-11-12T22:59:59.999Z' })
    expect(result.week.attendance).toMatchObject({ attended: 2, standing: 'met' })
    expect(result.nextMatch).toMatchObject({ id: 'fixture-20', date: '2026-11-21' })
  })

  it('runs every member read as the member', async () => {
    backend({ weekPractices: [[practice(5, 1, '2026-11-11'), practice(6, 14, '2026-11-12')]] })

    await getBackendWeek(MEMBER, NOW)

    const memberReads = request.mock.calls
      .map(([options]) => options as { path: string; auth?: { as: string } })
      .filter((options) => !options.path.startsWith('/practice-sessions?limit=300&where%5Bdate'))
    expect(memberReads.every((options) => options.auth?.as === 'member')).toBe(true)
  })

  it('reads no squads in a week without matches', async () => {
    request.mockImplementation(({ path }: { path: string }) => {
      if (path.startsWith('/players/')) return Promise.resolve({ squadTeam: 1 })
      if (path.startsWith('/squads')) throw new Error('should not read squads')
      return Promise.resolve({ docs: [] })
    })

    const result = await getBackendWeek(MEMBER, NOW)

    expect(result).toMatchObject({ kind: 'week', nextMatch: null })
  })
})
