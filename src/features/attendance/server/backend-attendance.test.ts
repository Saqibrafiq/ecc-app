import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

type Mocks = {
  request: Mock
  squadTeam: number | null
  answers: Record<string, { answer: 'going' | 'not-going'; reason: null }>
  targetsStartOn: string | null
}

const mocks = vi.hoisted<Mocks>(() => ({
  request: vi.fn(),
  squadTeam: 1,
  answers: {},
  targetsStartOn: null,
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: mocks.request }))
vi.mock('@/features/week', async () => ({
  ...(await vi.importActual<typeof Week>('@/features/week')),
  getSquadTeamId: () => Promise.resolve(mocks.squadTeam),
  getClubTeams: () => Promise.resolve(new Map([[1, { id: '1', name: 'ECC I' }]])),
  getTeamSeasonPractices: () =>
    Promise.resolve([
      { id: 'practice-3', date: day('2026-10-28'), isCancelled: false, isRecorded: true },
      { id: 'practice-4', date: day('2026-11-04'), isCancelled: false, isRecorded: true },
    ]),
  getAttendedPracticeIds: () => Promise.resolve(new Set(['practice-3'])),
  getAnswers: () => Promise.resolve(mocks.answers),
  getDeadlineDays: () => Promise.resolve(new Map([['fixture-61', 'thursday']])),
}))

import type * as Week from '@/features/week'

const { getBackendLedger, getCorrections, getSeasonStart } = await import('./backend-attendance')

const MEMBER = { playerId: 114, token: 'jwt', isCaptain: false }
const NOW = new Date('2026-11-09T09:00:00Z')

const team = (id: number, shortName: string, isClubTeam: boolean) => ({
  id,
  name: shortName,
  shortName,
  isClubTeam,
})
const fixture = (id: number, date: string, clubCode: string) => ({
  id,
  date: `${date}T12:00:00.000Z`,
  team1: team(2, 'NCC-I', false),
  team2: team(1, 'ECC-I', true),
  ground: { name: 'Ground', clubCode },
  competition: { name: 'BCV Regionalliga', maxOvers: 50 },
})

beforeEach(() => {
  mocks.request.mockReset()
  mocks.squadTeam = 1
  mocks.targetsStartOn = null
  mocks.answers = { 'fixture-60': { answer: 'going', reason: null } }
  mocks.request.mockImplementation(({ path }: { path: string }) => {
    if (path.startsWith('/globals/members-app-settings')) {
      return Promise.resolve({ targetsStartOn: mocks.targetsStartOn })
    }
    if (path.startsWith('/attendance-corrections')) {
      return Promise.resolve({ docs: [{ practice: 4, status: 'requested' }] })
    }
    if (path.startsWith('/fixtures')) {
      return Promise.resolve({
        docs: [
          fixture(60, '2026-10-31', 'NCC'),
          fixture(61, '2026-11-14', 'NCC'),
          { ...fixture(62, '2026-11-21', 'X'), team2: team(3, 'TSV', false) },
        ],
      })
    }
    return Promise.reject(new Error(`unexpected ${path}`))
  })
})

describe('getSeasonStart', () => {
  it('starts the season on 1 January', () => {
    expect(getSeasonStart(day('2026-11-09'))).toBe('2026-01-01')
  })
})

describe('getCorrections', () => {
  it("reads the member's requests by practice", async () => {
    await expect(getCorrections(MEMBER)).resolves.toEqual(new Map([['practice-4', 'requested']]))
  })
})

describe('getBackendLedger', () => {
  it("builds the member's season from their team's practices, matches and answers", async () => {
    const result = await getBackendLedger(MEMBER, NOW)

    if (result.kind !== 'ledger') throw new Error('expected a ledger')
    const { ledger } = result
    expect(ledger.team).toEqual({ id: '1', name: 'ECC I' })
    expect(ledger.months[0]?.practices.map((p) => [p.practiceId, p.outcome, p.correction])).toEqual(
      [[4, 'missed', 'requested']],
    )
    expect(ledger.standing.matchDate).toBe('2026-11-14')
    expect(ledger.targets).toEqual([
      expect.objectContaining({ kind: 'away', available: 1, upcoming: 1 }),
    ])
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('where%5Bdate%5D%5Bless_than%5D=2027-01-01') as string,
      }),
    )
  })

  it('counts the targets from the day the Board set', async () => {
    mocks.targetsStartOn = '2026-11-01T12:00:00.000Z'

    const result = await getBackendLedger(MEMBER, NOW)

    expect(result.kind === 'ledger' && result.ledger.targets[0]).toMatchObject({
      available: 0,
      upcoming: 1,
    })
  })

  it('adds the captain target for a captain', async () => {
    const result = await getBackendLedger({ ...MEMBER, isCaptain: true }, NOW)

    expect(result.kind === 'ledger' && result.ledger.targets.map((t) => t.kind)).toEqual([
      'away',
      'captain',
    ])
  })

  it('reports a member without a team squad', async () => {
    mocks.squadTeam = null

    await expect(getBackendLedger(MEMBER, NOW)).resolves.toEqual({ kind: 'no-squad' })
  })
})
