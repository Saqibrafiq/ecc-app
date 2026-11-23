import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

const request = vi.hoisted(() => vi.fn<(call: Call) => Promise<unknown>>())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: request }))

const { getBackendSeason } = await import('./backend-season')

// Monday 9 November 2026, 10:00 in Erlangen.
const NOW = new Date('2026-11-09T09:00:00Z')

const team = (id: number, shortName: string, isClubTeam: boolean) => ({
  id,
  name: shortName,
  shortName,
  isClubTeam,
})
const fixture = (id: number, date: string, extra: object = {}) => ({
  id,
  date: `${date}T12:00:00.000Z`,
  startTime: '11:00',
  team1: team(2, 'NCC-I', false),
  team2: team(1, 'ECC-I', true),
  ground: { name: 'Nürnberg', clubCode: 'NCC' },
  competition: { name: 'BCV Regionalliga Bayern', maxOvers: 50 },
  status: 'scheduled',
  ...extra,
})
const FIXTURES = [
  fixture(1, '2026-09-06', {
    status: 'completed',
    matchResult: { kind: 'win', winnerTeamId: 1, margin: { unit: 'runs', value: 9 }, isDls: false },
  }),
  fixture(60, '2026-11-14'),
  fixture(61, '2026-11-15', { team1: team(14, 'ECC-II', true), team2: team(3, 'TSVGC', false) }),
  fixture(70, '2026-11-15', { team1: team(2, 'NCC-I', false), team2: team(3, 'TSVGC', false) }),
]
const TEAMS = [team(1, 'ECC-I', true), team(14, 'ECC-II', true)]

type Call = { path: string; auth: unknown; schema: z.ZodType }
const paths = () => request.mock.calls.map(([call]) => call)

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(({ path, schema }: Call) => {
    const body = path.startsWith('/players/')
      ? { squadTeam: 14 }
      : { docs: path.startsWith('/teams') ? TEAMS : FIXTURES }
    return Promise.resolve(schema.parse(body))
  })
})

describe('getBackendSeason', () => {
  it("reads the year's fixtures as the member and builds the season", async () => {
    const season = await getBackendSeason({ token: 'jwt', playerId: 52 }, NOW)

    const fixturesCall = paths().find((call) => call.path.startsWith('/fixtures'))
    const query = new URLSearchParams(fixturesCall?.path.split('?')[1])
    expect(query.get('where[date][greater_than_equal]')).toBe('2026-01-01T00:00:00.000Z')
    expect(query.get('where[date][less_than]')).toBe('2027-01-01T00:00:00.000Z')
    expect(fixturesCall?.auth).toEqual({ as: 'member', token: 'jwt' })

    expect(season.year).toBe(2026)
    expect(season.nextDate).toBe('2026-11-14')
    expect(season.months.map((month) => month.month)).toEqual(['2026-09-01', '2026-11-01'])
    expect(season.record).toEqual({
      team: { id: '14', name: 'ECC II' },
      played: 0,
      won: 0,
      lost: 0,
      remaining: 1,
    })
  })

  it('leaves out fixtures without an ECC team', async () => {
    const season = await getBackendSeason({ token: 'jwt', playerId: 52 }, NOW)

    const sunday = season.months[1]?.days.find((day) => day.date === '2026-11-15')
    expect(sunday?.fixtures.map((item) => item.id)).toEqual(['fixture-61'])
  })

  it('shows the season without a team for an unlinked account or one without a squad', async () => {
    const unlinked = await getBackendSeason({ token: 'jwt', playerId: null }, NOW)
    expect(unlinked.record).toBeNull()
    expect(paths().some((call) => call.path.startsWith('/players/'))).toBe(false)

    request.mockImplementation(({ path, schema }: Call) =>
      Promise.resolve(
        schema.parse(
          path.startsWith('/players/')
            ? { squadTeam: 99 }
            : { docs: path.startsWith('/teams') ? TEAMS : FIXTURES },
        ),
      ),
    )
    expect((await getBackendSeason({ token: 'jwt', playerId: 52 }, NOW)).record).toBeNull()
  })
})
