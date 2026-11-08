import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SelectionData } from '@/features/team'

const mocks = vi.hoisted(() => ({ request: vi.fn(), schedule: vi.fn(), selection: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: mocks.request }))
vi.mock('@/features/week', () => ({ getClubSchedule: mocks.schedule }))
vi.mock('@/features/team', async () => ({
  ...(await vi.importActual<typeof Team>('@/features/team')),
  loadSelection: mocks.selection,
}))

import type * as Team from '@/features/team'

const { getBoardMatches, loadBoardSquad, toBoardSquad } = await import('./backend-board')
const { getSampleBoardSelection } = await import('./sample-board')

const ADMIN = { token: 'jwt', teamId: null, isAdmin: true }
const NOW = new Date('2026-11-11T20:00:00Z')

const match = (id: number, date: string, team = 'ECC I') => ({
  id: `fixture-${String(id)}`,
  kind: 'match',
  team: { id: team, name: team },
  date,
  startTime: null,
  ground: 'Erlangen',
  opponent: 'TSV',
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBoardMatches', () => {
  it("lists every team's match with its squad, waiting ones first", async () => {
    mocks.schedule.mockResolvedValue({
      matches: [
        match(60, '2026-11-14'),
        match(61, '2026-11-15', 'ECC II'),
        match(62, '2026-11-15'),
      ],
    })
    mocks.request.mockResolvedValue({
      docs: [
        { fixture: 61, status: 'submitted', deadlineDay: 'wednesday' },
        { fixture: 62, status: 'approved', deadlineDay: null },
      ],
    })

    const matches = await getBoardMatches(ADMIN, NOW)

    expect(matches.map((m) => [m.fixtureId, m.squadStatus, m.deadlineDay])).toEqual([
      [61, 'submitted', 'wednesday'],
      [60, 'open', 'tuesday'],
      [62, 'approved', 'tuesday'],
    ])
    expect(mocks.schedule).toHaveBeenCalledWith({ as: 'member', token: 'jwt' }, '2026-11-09')
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('60%2C61%2C62') as string }),
    )
  })

  it('reads no squads in a week without matches', async () => {
    mocks.schedule.mockResolvedValue({ matches: [] })

    await expect(getBoardMatches(ADMIN, NOW)).resolves.toEqual([])
    expect(mocks.request).not.toHaveBeenCalled()
  })
})

describe('toBoardSquad', () => {
  it('gives the squad in order with names, the deadline and the exception candidates', () => {
    const data: SelectionData = getSampleBoardSelection(NOW)

    const squad = toBoardSquad({ ...data, deadlineDay: 'thursday', exceptionIds: ['4'] })

    expect(squad.squad).toHaveLength(12)
    expect(squad.squad[0]).toEqual({ playerId: '2', role: 'playing', name: 'Ali Shaan' })
    expect(squad.squad.at(-1)?.role).toBe('twelfth')
    expect(squad.closesAt).toMatch(/T22:59:59\.999Z$/)
    expect(squad.blocked.map((c) => c.name)).toEqual(['Omar Farooq', 'Usman Khan'])
    expect(squad.exceptionIds).toEqual(['4'])
  })
})

describe('loadBoardSquad', () => {
  it("loads any club team's squad as the admin, or nothing for an unknown match", async () => {
    mocks.selection.mockResolvedValueOnce(getSampleBoardSelection(NOW))
    await expect(loadBoardSquad(ADMIN, 201, NOW)).resolves.toMatchObject({ deadlineDay: 'tuesday' })
    expect(mocks.selection).toHaveBeenCalledWith(ADMIN, 201, NOW)

    mocks.selection.mockResolvedValueOnce(null)
    await expect(loadBoardSquad(ADMIN, 999, NOW)).resolves.toBeNull()
  })
})
