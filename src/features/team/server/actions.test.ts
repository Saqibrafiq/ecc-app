import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { Candidate } from '../types'
import type { TeamAccess } from './team-access'

type Mocks = {
  access: TeamAccess
  checkIn: Mock
  selection: Mock
  request: Mock
  logError: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  access: { kind: 'allowed', actor: { teamId: 1, token: 'jwt', isAdmin: false } },
  checkIn: vi.fn(),
  selection: vi.fn(),
  request: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-11T20:00:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    backendRequest: mocks.request,
  }
})
vi.mock('./team-access', () => ({ getTeamAccess: () => Promise.resolve(mocks.access) }))
vi.mock('./backend-team', () => ({ loadCheckIn: mocks.checkIn, loadSelection: mocks.selection }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { saveCheckInAction, submitSquadAction } = await import('./actions')

const CAPTAIN = { teamId: 1, token: 'jwt', isAdmin: false }

function checkInData(overrides: { canCheckIn?: boolean; isRecorded?: boolean } = {}) {
  return {
    checkIn: {
      practiceId: 6,
      canCheckIn: true,
      isRecorded: false,
      players: ['1', '2', '3'].map((id) => ({ id })),
      ...overrides,
    },
    teamId: 1,
    records: [{ id: 40, playerId: '2', attended: true }],
    answers: new Map([['1', 'going']]),
  }
}

const candidate = (id: string, overrides: Partial<Candidate> = {}): Candidate => ({
  id,
  name: `Player ${id}`,
  answer: 'going',
  eligibility: { verdict: 'selectable', reasons: [], override: null },
  attendance: { attended: 2, required: 2, isRuleActive: true },
  isCarriedOver: false,
  ...overrides,
})
const IDS = Array.from({ length: 14 }, (_, index) => String(index + 1))
const SQUAD_PICKS = [
  ...IDS.slice(0, 11).map((playerId) => ({ playerId, role: 'playing' as const })),
  { playerId: '12', role: 'twelfth' as const },
]

function selectionData(overrides: { status?: string; candidates?: Candidate[] } = {}) {
  return {
    selection: {
      status: overrides.status ?? 'open',
      candidates: overrides.candidates ?? IDS.map((id) => candidate(id)),
    },
    squadId: 9,
    carryOvers: [],
    notGoing: new Set<string>(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.access = { kind: 'allowed', actor: CAPTAIN }
  mocks.request.mockResolvedValue({})
})

describe('saveCheckInAction', () => {
  it("records new arrivals, corrects changed records and closes the practice's check-in", async () => {
    mocks.checkIn.mockResolvedValue(checkInData())

    await expect(saveCheckInAction({ practiceId: 6, presentIds: ['1', '3'] })).resolves.toEqual({
      status: 'saved',
    })

    expect(mocks.checkIn).toHaveBeenCalledWith(CAPTAIN, 6, new Date('2026-11-11T20:00:00Z'))
    expect(mocks.request.mock.calls.map(([options]) => options as object)).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/attendance',
        auth: { as: 'member', token: 'jwt' },
        body: { practice: 6, player: 1, team: 1, attended: true, isWalkIn: false },
      }),
      expect.objectContaining({
        method: 'PATCH',
        path: '/attendance/40',
        body: { attended: false },
      }),
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ player: 3, isWalkIn: true }) as object,
      }),
      expect.objectContaining({
        method: 'PATCH',
        path: '/practice-sessions/6',
        body: { isRecorded: true },
      }),
    ])
  })

  it('does not close a check-in again when correcting it', async () => {
    mocks.checkIn.mockResolvedValue(checkInData({ isRecorded: true }))

    await saveCheckInAction({ practiceId: 6, presentIds: ['2'] })

    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('refuses bad input, other players, unknown practices and early check-ins', async () => {
    await expect(saveCheckInAction({ practiceId: 'x' })).resolves.toEqual({ status: 'invalid' })

    mocks.checkIn.mockResolvedValueOnce(checkInData())
    await expect(saveCheckInAction({ practiceId: 6, presentIds: ['99'] })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.checkIn.mockResolvedValueOnce(null)
    await expect(saveCheckInAction({ practiceId: 7, presentIds: [] })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.checkIn.mockResolvedValueOnce(checkInData({ canCheckIn: false }))
    await expect(saveCheckInAction({ practiceId: 6, presentIds: [] })).resolves.toEqual({
      status: 'not-yet',
    })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('is for captains only', async () => {
    mocks.access = { kind: 'not-captain' }

    await expect(saveCheckInAction({ practiceId: 6, presentIds: [] })).resolves.toEqual({
      status: 'unauthorized',
    })
  })

  it('reports a refused write as unauthorized and logs other failures', async () => {
    mocks.checkIn.mockResolvedValue(checkInData())
    mocks.request.mockRejectedValueOnce(new BackendError(403, 'Forbidden'))
    await expect(saveCheckInAction({ practiceId: 6, presentIds: ['1'] })).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.request.mockRejectedValueOnce(new Error('down'))
    await expect(saveCheckInAction({ practiceId: 6, presentIds: ['1'] })).resolves.toEqual({
      status: 'error',
    })
    expect(mocks.logError).toHaveBeenCalledWith('Saving a check-in failed', expect.any(Error))
  })
})

describe('submitSquadAction', () => {
  it('hands the squad to the Board as the captain', async () => {
    mocks.selection.mockResolvedValue(selectionData())

    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'submitted',
    })

    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/squads/9',
        auth: { as: 'member', token: 'jwt' },
        body: {
          status: 'submitted',
          picks: SQUAD_PICKS.map((pick) => ({
            player: Number(pick.playerId),
            role: pick.role,
            isBorrowed: false,
          })),
        },
      }),
    )
  })

  it('accepts a carried-over player the captain picked', async () => {
    const candidates = IDS.map((id) => candidate(id, { isCarriedOver: id === '1' }))
    mocks.selection.mockResolvedValue({ ...selectionData({ candidates }), carryOvers: ['1'] })

    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'submitted',
    })
  })

  it('refuses an incomplete squad, a player who cannot be picked, or a stranger', async () => {
    mocks.selection.mockResolvedValue(selectionData())
    await expect(
      submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS.slice(0, 10) }),
    ).resolves.toEqual({ status: 'invalid' })

    const blocked = IDS.map((id) =>
      candidate(id, {
        eligibility:
          id === '3'
            ? { verdict: 'not-selectable', reasons: ['no-show'], override: null }
            : { verdict: 'selectable', reasons: [], override: null },
      }),
    )
    mocks.selection.mockResolvedValue(selectionData({ candidates: blocked }))
    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.selection.mockResolvedValue(
      selectionData({ candidates: IDS.slice(1).map((id) => candidate(id)) }),
    )
    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'invalid',
    })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('refuses bad input, unknown matches, and squads already submitted or announced', async () => {
    await expect(submitSquadAction({ fixtureId: 60, picks: 'all' })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.selection.mockResolvedValueOnce(null)
    await expect(submitSquadAction({ fixtureId: 61, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'invalid',
    })

    for (const status of ['submitted', 'approved']) {
      mocks.selection.mockResolvedValueOnce(selectionData({ status }))
      await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
        status: 'locked',
      })
    }
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('is for captains only, and logs failures', async () => {
    mocks.access = { kind: 'signed-out' }
    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.access = { kind: 'allowed', actor: CAPTAIN }
    mocks.selection.mockRejectedValue(new Error('down'))
    await expect(submitSquadAction({ fixtureId: 60, picks: SQUAD_PICKS })).resolves.toEqual({
      status: 'error',
    })
    expect(mocks.logError).toHaveBeenCalledWith('Submitting a squad failed', expect.any(Error))
  })
})
