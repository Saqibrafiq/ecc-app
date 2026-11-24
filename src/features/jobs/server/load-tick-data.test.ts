import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { z } from 'zod'

type Call = { path: string; auth: unknown; schema: z.ZodType }
type Mocks = {
  request: Mock<(call: Call) => Promise<unknown>>
  schedule: Mock
  seasonPractices: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  request: vi.fn(),
  schedule: vi.fn(),
  seasonPractices: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: mocks.request }))
vi.mock('@/features/week', async () => {
  const actual = await vi.importActual<typeof Week>('@/features/week')
  return {
    answerDocSchema: actual.answerDocSchema,
    toPracticeEvent: actual.toPracticeEvent,
    getClubSchedule: mocks.schedule,
    getTeamSeasonPractices: mocks.seasonPractices,
  }
})

import type * as Week from '@/features/week'

const { loadTickData } = await import('./load-tick-data')

// Monday 9 November 2026, 12:00 in Erlangen.
const NOW = new Date('2026-11-09T11:00:00Z')
const SERVICE = { as: 'service' }
const STAMP = '2026-11-08T10:00:00.000Z'
const ECC_I = { id: '1', name: 'ECC I' }
const MATCH = {
  id: 'fixture-60',
  kind: 'match',
  team: ECC_I,
  date: '2026-11-14',
  startTime: '11:00',
  ground: 'Nürnberg',
  opponent: 'NCC-I',
}
const practice = (id: number, extra: object = {}) => ({
  id,
  team: 1,
  date: '2026-11-11T12:00:00.000Z',
  startTime: '18:30',
  ...extra,
})

let responses: Record<string, Record<string, unknown>[]> = {}

/** The squads asked for: the query names their fixtures. */
function squadsFor(path: string) {
  const ids = new URLSearchParams(path.split('?')[1]).get('where[fixture][in]')?.split(',') ?? []
  return (responses['/squads'] ?? []).filter((doc) => ids.includes(String(doc.fixture)))
}

beforeEach(() => {
  mocks.schedule.mockReset()
  mocks.schedule.mockResolvedValue({
    teams: new Map([[1, ECC_I]]),
    matches: [MATCH],
    practices: [practice(7), practice(8, { isCancelled: true }), practice(9, { team: 99 })],
  })
  mocks.seasonPractices.mockReset()
  mocks.seasonPractices.mockResolvedValue([])
  responses = {
    '/squads': [
      {
        fixture: 60,
        status: 'submitted',
        deadlineDay: 'wednesday',
        statusChangedAt: STAMP,
        picks: [{ player: 101, role: 'playing' }],
      },
    ],
    '/users': [
      { id: 1, role: 'captain', captainOf: 1, player: { id: 101, squadTeam: 1 } },
      { id: 2, role: 'player', captainOf: null, player: { id: 102, squadTeam: { id: 1 } } },
      { id: 3, role: 'admin', captainOf: 1, player: null },
      { id: 4, role: 'captain', captainOf: null, player: { id: 104, squadTeam: null } },
    ],
    '/availability-responses': [
      { id: 1, player: 101, fixture: 60, practice: null, response: 'going' },
      { id: 2, player: 102, fixture: 60, practice: null, response: 'not-going' },
      { id: 3, player: 102, fixture: null, practice: 7, response: 'going' },
      { id: 4, player: 102, fixture: null, practice: null, response: 'going' },
    ],
  }
  mocks.request.mockReset()
  mocks.request.mockImplementation(({ path, schema }: Call) => {
    const collection = path.split('?')[0] ?? ''
    const docs = collection === '/squads' ? squadsFor(path) : (responses[collection] ?? [])
    return Promise.resolve(schema.parse({ docs }))
  })
})

const callsTo = (collection: string) =>
  (mocks.request.mock.calls as [Call][])
    .map(([call]) => call)
    .filter((call) => call.path.startsWith(collection))
const callTo = (collection: string) => callsTo(collection)[0]
const queryOf = (call: Call | undefined) => new URLSearchParams(call?.path.split('?')[1])

describe('loadTickData', () => {
  it("reads the club's week as the service account, creating missing practices first", async () => {
    const data = await loadTickData(NOW)

    expect(mocks.schedule).toHaveBeenCalledWith(SERVICE, '2026-11-09')
    expect(callTo('/users')?.auth).toEqual(SERVICE)
    expect(data.events.map((event) => event.id)).toEqual(['fixture-60', 'practice-7'])
    expect(data.events[0]).toMatchObject({ deadlineDay: 'wednesday' })
  })

  it('knows every member, their team, the team a captain leads and the Board', async () => {
    const data = await loadTickData(NOW)

    expect(data.members).toEqual([
      { userId: 1, playerId: 101, teamId: '1', captainOfTeamId: '1', isBoard: false },
      { userId: 2, playerId: 102, teamId: '1', captainOfTeamId: null, isBoard: false },
      // Only a captain leads a team; an admin's old captainOf does not count.
      { userId: 3, playerId: null, teamId: null, captainOfTeamId: null, isBoard: true },
      // A captain the Board has not yet given a team leads none.
      { userId: 4, playerId: 104, teamId: null, captainOfTeamId: null, isBoard: false },
    ])
  })

  it("knows the answers, who said Going and each squad's step with its stamp", async () => {
    const data = await loadTickData(NOW)

    expect(data.answers).toEqual(
      new Map([
        [101, new Set(['fixture-60'])],
        [102, new Set(['fixture-60', 'practice-7'])],
      ]),
    )
    expect(data.going).toEqual(
      new Map([
        ['fixture-60', new Set([101])],
        ['practice-7', new Set([102])],
      ]),
    )
    expect(data.squads).toEqual([
      {
        matchId: 'fixture-60',
        status: 'submitted',
        statusChangedAt: STAMP,
        picks: [{ playerId: 101, role: 'playing' }],
      },
    ])
    expect(queryOf(callTo('/availability-responses')).get('where[or][0][fixture][in]')).toBe('60')
    expect(queryOf(callTo('/availability-responses')).get('where[or][1][practice][in]')).toBe('7')
  })

  it('reads a squad without a stamp or picks, and asks only for the kinds of events there are', async () => {
    responses['/squads'] = [{ fixture: 60, status: 'open', deadlineDay: 'tuesday' }]
    mocks.schedule.mockResolvedValueOnce({
      teams: new Map([[1, ECC_I]]),
      matches: [MATCH],
      practices: [],
    })

    const data = await loadTickData(NOW)

    expect(data.squads).toEqual([
      { matchId: 'fixture-60', status: 'open', statusChangedAt: null, picks: [] },
    ])
    const query = queryOf(callTo('/availability-responses'))
    expect(query.get('where[or][0][fixture][in]')).toBe('60')
    expect(query.has('where[or][1][practice][in]')).toBe(false)
  })

  it('reads no squads, answers or attendance in a week without events', async () => {
    mocks.schedule.mockResolvedValueOnce({ teams: new Map(), matches: [], practices: [] })

    const data = await loadTickData(NOW)

    expect(data.events).toEqual([])
    expect(data.attendance).toEqual([])
    expect(callTo('/squads')).toBeUndefined()
    expect(callTo('/availability-responses')).toBeUndefined()
  })
})

describe('loadTickData: attendance (UC-8)', () => {
  const SEASON = [{ id: 'practice-6', date: '2026-11-04', isCancelled: false, isRecorded: true }]

  beforeEach(() => {
    mocks.schedule.mockResolvedValue({
      teams: new Map([[1, ECC_I]]),
      matches: [MATCH],
      practices: [practice(7, { isRecorded: true })],
    })
    mocks.seasonPractices.mockResolvedValue(SEASON)
    responses['/squads']?.push({
      fixture: 59,
      status: 'approved',
      deadlineDay: 'tuesday',
      picks: [
        { player: 101, role: 'playing' },
        { player: 102, role: 'twelfth' },
        { player: 103, role: 'reserve' },
      ],
    })
    Object.assign(responses['/squads']?.[0] ?? {}, { exceptions: [104] })
    responses['/fixtures'] = [{ id: 59 }]
    responses['/attendance'] = [
      { player: 101, practice: 6 },
      { player: 101, practice: 7 },
      { player: 102, practice: 7 },
    ]
  })

  it("reads a recorded practice's team: season, attendance, and who is selectable anyway", async () => {
    const data = await loadTickData(NOW)

    expect(data.recordedPracticeIds).toEqual(new Set(['practice-7']))
    expect(mocks.seasonPractices).toHaveBeenCalledWith(SERVICE, 1, '2026-01-01')
    expect(data.attendance).toEqual([
      {
        teamId: '1',
        seasonStart: '2026-01-01',
        practices: SEASON,
        attended: new Map([
          [101, new Set(['practice-6', 'practice-7'])],
          [102, new Set(['practice-7'])],
        ]),
        // Last match's 12th man and reserve (R-13), and this week's exception (R-8).
        selectableAnyway: new Set([102, 103, 104]),
      },
    ])
    expect(queryOf(callTo('/attendance')).get('where[team][equals]')).toBe('1')
    expect(queryOf(callTo('/fixtures')).get('where[date][less_than]')).toBe(
      '2026-11-09T00:00:00.000Z',
    )
  })

  it('carries nobody over from a squad never announced, or without a previous match', async () => {
    const previous = responses['/squads']?.find((doc) => doc.fixture === 59)
    Object.assign(previous ?? {}, { status: 'submitted' })
    expect((await loadTickData(NOW)).attendance[0]?.selectableAnyway).toEqual(new Set([104]))

    responses['/fixtures'] = []
    expect((await loadTickData(NOW)).attendance[0]?.selectableAnyway).toEqual(new Set([104]))
  })

  it('copes with an announced squad stored without picks, and a match without a squad yet', async () => {
    responses['/squads'] = [{ fixture: 59, status: 'approved', deadlineDay: 'tuesday' }]

    expect((await loadTickData(NOW)).attendance[0]?.selectableAnyway).toEqual(new Set())
  })

  it('reads no attendance while no practice of the week is recorded', async () => {
    mocks.schedule.mockResolvedValueOnce({
      teams: new Map([[1, ECC_I]]),
      matches: [MATCH],
      practices: [practice(7)],
    })

    expect((await loadTickData(NOW)).attendance).toEqual([])
    expect(callTo('/attendance')).toBeUndefined()
  })
})
