import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { CaptainAccess } from './captain'

type Mocks = {
  isConfigured: boolean
  access: CaptainAccess
  teamWeek: Mock
  checkIn: Mock
  selection: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: false,
  access: { kind: 'signed-out' },
  teamWeek: vi.fn(),
  checkIn: vi.fn(),
  selection: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('./captain', () => ({ getCaptainAccess: () => Promise.resolve(mocks.access) }))
vi.mock('./backend-team', () => ({
  getBackendTeamWeek: mocks.teamWeek,
  loadCheckIn: mocks.checkIn,
  loadSelection: mocks.selection,
}))

const { getCheckIn, getSquadSelection, getTeamWeek, isTeamCaptain } = await import('./queries')

const CAPTAIN: CaptainAccess = { kind: 'captain', captain: { teamId: 1, token: 'jwt' } }

beforeEach(() => {
  mocks.isConfigured = true
  mocks.access = CAPTAIN
  vi.clearAllMocks()
})

describe('in the preview', () => {
  beforeEach(() => {
    mocks.isConfigured = false
  })

  it('shows the team screens with sample data', async () => {
    await expect(isTeamCaptain()).resolves.toBe(true)
    await expect(getTeamWeek()).resolves.toMatchObject({ kind: 'team-week', isPreview: true })
    await expect(getCheckIn(101)).resolves.toMatchObject({ kind: 'check-in', isPreview: true })
    await expect(getSquadSelection(201)).resolves.toMatchObject({
      kind: 'selection',
      isPreview: true,
    })
  })

  it('knows only the sample practice and match', async () => {
    await expect(getCheckIn(5)).resolves.toEqual({ kind: 'not-found' })
    await expect(getSquadSelection(5)).resolves.toEqual({ kind: 'not-found' })
  })
})

describe('with the backend', () => {
  it('gives the team screens to captains only', async () => {
    await expect(isTeamCaptain()).resolves.toBe(true)

    for (const access of [{ kind: 'signed-out' }, { kind: 'not-captain' }] as const) {
      mocks.access = access
      await expect(isTeamCaptain()).resolves.toBe(false)
      await expect(getTeamWeek()).resolves.toEqual(access)
      await expect(getCheckIn(6)).resolves.toEqual(access)
      await expect(getSquadSelection(60)).resolves.toEqual(access)
    }
    expect(mocks.teamWeek).not.toHaveBeenCalled()
  })

  it("loads the captain's team week, check-in and selection", async () => {
    mocks.teamWeek.mockResolvedValue({ team: { id: '1', name: 'ECC I' } })
    mocks.checkIn.mockResolvedValue({ checkIn: { practiceId: 6 } })
    mocks.selection.mockResolvedValue({ selection: { fixtureId: 60 } })

    await expect(getTeamWeek()).resolves.toEqual({
      kind: 'team-week',
      teamWeek: { team: { id: '1', name: 'ECC I' } },
      isPreview: false,
    })
    await expect(getCheckIn(6)).resolves.toEqual({
      kind: 'check-in',
      checkIn: { practiceId: 6 },
      isPreview: false,
    })
    await expect(getSquadSelection(60)).resolves.toEqual({
      kind: 'selection',
      selection: { fixtureId: 60 },
      isPreview: false,
    })
    expect(mocks.checkIn).toHaveBeenCalledWith(
      { teamId: 1, token: 'jwt' },
      6,
      new Date('2026-11-09T09:00:00Z'),
    )
  })

  it("answers not found for a missing match or practice, or another team's", async () => {
    mocks.checkIn.mockResolvedValue(null)
    mocks.selection.mockResolvedValue(null)

    await expect(getCheckIn(7)).resolves.toEqual({ kind: 'not-found' })
    await expect(getSquadSelection(61)).resolves.toEqual({ kind: 'not-found' })
  })
})
