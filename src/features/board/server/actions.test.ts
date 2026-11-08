import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { SquadStatus } from '@/features/team'

import type { BoardAccess } from './board-access'

type Mocks = { access: BoardAccess; selection: Mock; request: Mock; logError: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  access: { kind: 'board', actor: { token: 'jwt', teamId: null, isAdmin: true } },
  selection: vi.fn(),
  request: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-12T18:00:00Z') }))
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
vi.mock('@/features/team', () => ({ loadSelection: mocks.selection }))
vi.mock('./board-access', () => ({ getBoardAccess: () => Promise.resolve(mocks.access) }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { approveSquadAction, sendBackSquadAction, setDeadlineAction, setExceptionAction } =
  await import('./actions')

const squad = (status: SquadStatus) => ({
  selection: { status },
  squadId: 9,
  exceptionIds: ['4'],
})

const patched = () => (mocks.request.mock.calls[0] as [{ path: string; body: unknown }])[0]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.access = { kind: 'board', actor: { token: 'jwt', teamId: null, isAdmin: true } }
  mocks.request.mockResolvedValue({})
})

describe('approveSquadAction', () => {
  it('approves and announces a handed-in squad, with the time', async () => {
    mocks.selection.mockResolvedValue(squad('submitted'))

    await expect(approveSquadAction({ fixtureId: 60 })).resolves.toEqual({ status: 'saved' })

    expect(patched()).toMatchObject({
      path: '/squads/9',
      body: { status: 'approved', approvedAt: '2026-11-12T18:00:00.000Z' },
    })
  })

  it('approves nothing the captain has not handed in', async () => {
    for (const status of ['open', 'returned', 'approved'] as const) {
      mocks.selection.mockResolvedValueOnce(squad(status))
      await expect(approveSquadAction({ fixtureId: 60 })).resolves.toEqual({
        status: 'not-allowed',
      })
    }
    expect(mocks.request).not.toHaveBeenCalled()
  })
})

describe('sendBackSquadAction', () => {
  it('reopens a squad for the captain with the trimmed note', async () => {
    mocks.selection.mockResolvedValue(squad('approved'))

    await expect(sendBackSquadAction({ fixtureId: 60, note: '  Pick a keeper ' })).resolves.toEqual(
      { status: 'saved' },
    )

    expect(patched().body).toEqual({ status: 'returned', note: 'Pick a keeper' })
  })

  it('needs a note, and a squad that was handed in', async () => {
    await expect(sendBackSquadAction({ fixtureId: 60, note: '  ' })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.selection.mockResolvedValue(squad('open'))
    await expect(sendBackSquadAction({ fixtureId: 60, note: 'Why' })).resolves.toEqual({
      status: 'not-allowed',
    })
  })
})

describe('setDeadlineAction', () => {
  it('moves the deadline until the squad is announced', async () => {
    mocks.selection.mockResolvedValueOnce(squad('open'))
    await expect(setDeadlineAction({ fixtureId: 60, deadlineDay: 'thursday' })).resolves.toEqual({
      status: 'saved',
    })
    expect(patched().body).toEqual({ deadlineDay: 'thursday' })

    mocks.selection.mockResolvedValueOnce(squad('approved'))
    await expect(setDeadlineAction({ fixtureId: 60, deadlineDay: 'friday' })).resolves.toEqual({
      status: 'invalid',
    })
    await expect(setDeadlineAction({ fixtureId: 60, deadlineDay: 'thursday' })).resolves.toEqual({
      status: 'not-allowed',
    })
  })
})

describe('setExceptionAction', () => {
  it('allows a player for this match, or takes it back', async () => {
    mocks.selection.mockResolvedValue(squad('open'))

    await setExceptionAction({ fixtureId: 60, playerId: '5', isAllowed: true })
    expect(patched().body).toEqual({ exceptions: [4, 5] })

    mocks.request.mockClear()
    await setExceptionAction({ fixtureId: 60, playerId: '4', isAllowed: false })
    expect(patched().body).toEqual({ exceptions: [] })
  })
})

describe('every decision', () => {
  it('is for the Board only', async () => {
    mocks.access = { kind: 'not-board' }

    await expect(approveSquadAction({ fixtureId: 60 })).resolves.toEqual({
      status: 'unauthorized',
    })
    expect(mocks.selection).not.toHaveBeenCalled()
  })

  it('refuses an unknown match and reports failures', async () => {
    mocks.selection.mockResolvedValueOnce(null)
    await expect(approveSquadAction({ fixtureId: 999 })).resolves.toEqual({ status: 'invalid' })

    mocks.selection.mockResolvedValue(squad('submitted'))
    mocks.request.mockRejectedValueOnce(new BackendError(403, 'Forbidden'))
    await expect(approveSquadAction({ fixtureId: 60 })).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.request.mockRejectedValueOnce(new Error('down'))
    await expect(approveSquadAction({ fixtureId: 60 })).resolves.toEqual({ status: 'error' })
    expect(mocks.logError).toHaveBeenCalledWith('Approving a squad failed', expect.any(Error))
  })
})
