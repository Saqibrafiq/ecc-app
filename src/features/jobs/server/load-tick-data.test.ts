import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { z } from 'zod'

type Call = { path: string; auth: unknown; schema: z.ZodType }
type Mocks = { request: Mock<(call: Call) => Promise<unknown>>; schedule: Mock }

const mocks = vi.hoisted<Mocks>(() => ({ request: vi.fn(), schedule: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: mocks.request }))
vi.mock('@/features/week', async () => {
  const actual = await vi.importActual<typeof Week>('@/features/week')
  return {
    answerDocSchema: actual.answerDocSchema,
    toPracticeEvent: actual.toPracticeEvent,
    getClubSchedule: mocks.schedule,
  }
})

import type * as Week from '@/features/week'

const { loadTickData } = await import('./load-tick-data')

// Monday 9 November 2026, 12:00 in Erlangen.
const NOW = new Date('2026-11-09T11:00:00Z')
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

let responses: Record<string, unknown[]> = {}

beforeEach(() => {
  mocks.schedule.mockReset()
  mocks.schedule.mockResolvedValue({
    teams: new Map([[1, ECC_I]]),
    matches: [MATCH],
    practices: [practice(7), practice(8, { isCancelled: true }), practice(9, { team: 99 })],
  })
  responses = {
    '/squads': [{ fixture: 60, status: 'submitted', deadlineDay: 'wednesday' }],
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
    return Promise.resolve(schema.parse({ docs: responses[collection] ?? [] }))
  })
})

const callTo = (collection: string) =>
  (mocks.request.mock.calls as [Call][])
    .map(([call]) => call)
    .find((call) => call.path.startsWith(collection))

describe('loadTickData', () => {
  it("reads the club's week as the service account, creating missing practices first", async () => {
    const data = await loadTickData(NOW)

    expect(mocks.schedule).toHaveBeenCalledWith({ as: 'service' }, '2026-11-09')
    expect(callTo('/users')?.auth).toEqual({ as: 'service' })
    expect(data.events.map((event) => event.id)).toEqual(['fixture-60', 'practice-7'])
    expect(data.events[0]).toMatchObject({ deadlineDay: 'wednesday' })
  })

  it('knows every member, their team and the team a captain leads', async () => {
    const data = await loadTickData(NOW)

    expect(data.members).toEqual([
      { userId: 1, playerId: 101, teamId: '1', captainOfTeamId: '1' },
      { userId: 2, playerId: 102, teamId: '1', captainOfTeamId: null },
      // Only a captain leads a team; an admin's old captainOf does not count.
      { userId: 3, playerId: null, teamId: null, captainOfTeamId: null },
      // A captain the Board has not yet given a team leads none.
      { userId: 4, playerId: 104, teamId: null, captainOfTeamId: null },
    ])
  })

  it('counts answers and Going per event, and what has been recorded or decided', async () => {
    mocks.schedule.mockResolvedValueOnce({
      teams: new Map([[1, ECC_I]]),
      matches: [MATCH],
      practices: [practice(7, { isRecorded: true })],
    })

    const data = await loadTickData(NOW)

    expect(data.answers).toEqual(
      new Map([
        [101, new Set(['fixture-60'])],
        [102, new Set(['fixture-60', 'practice-7'])],
      ]),
    )
    expect(data.going).toEqual(
      new Map([
        ['fixture-60', 1],
        ['practice-7', 1],
      ]),
    )
    expect(data.recordedPracticeIds).toEqual(new Set(['practice-7']))
    expect(data.decidedFixtureIds).toEqual(new Set(['fixture-60']))
    const query = new URLSearchParams(callTo('/availability-responses')?.path.split('?')[1])
    expect(query.get('where[or][0][fixture][in]')).toBe('60')
    expect(query.get('where[or][1][practice][in]')).toBe('7')
  })

  it('treats an open squad as undecided, and asks only for the kinds of events there are', async () => {
    responses['/squads'] = [{ fixture: 60, status: 'open', deadlineDay: 'tuesday' }]
    mocks.schedule.mockResolvedValueOnce({
      teams: new Map([[1, ECC_I]]),
      matches: [MATCH],
      practices: [],
    })

    const data = await loadTickData(NOW)

    expect(data.decidedFixtureIds).toEqual(new Set())
    const query = new URLSearchParams(callTo('/availability-responses')?.path.split('?')[1])
    expect(query.get('where[or][0][fixture][in]')).toBe('60')
    expect(query.has('where[or][1][practice][in]')).toBe(false)
  })

  it('reads no squads or answers in a week without events', async () => {
    mocks.schedule.mockResolvedValueOnce({ teams: new Map(), matches: [], practices: [] })

    const data = await loadTickData(NOW)

    expect(data.events).toEqual([])
    expect(callTo('/squads')).toBeUndefined()
    expect(callTo('/availability-responses')).toBeUndefined()
  })
})
