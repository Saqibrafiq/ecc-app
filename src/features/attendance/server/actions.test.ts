import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = { member: Member | null; ledger: Mock; request: Mock; logError: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  member: null,
  ledger: vi.fn(),
  request: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve('jwt'),
}))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    backendRequest: mocks.request,
  }
})
vi.mock('./backend-attendance', () => ({ getBackendLedger: mocks.ledger }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { requestCorrectionAction } = await import('./actions')

const MEMBER: Member = {
  id: 27,
  email: 'player@example.com',
  name: 'Ali Shaan',
  role: 'player',
  playerId: 114,
  captainOfTeamId: null,
}

function ledgerWith(canRequestCorrection: boolean) {
  return {
    kind: 'ledger',
    ledger: {
      months: [{ month: '2026-11', practices: [{ practiceId: 5, canRequestCorrection }] }],
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.member = MEMBER
  mocks.request.mockResolvedValue({})
})

describe('requestCorrectionAction', () => {
  it('asks to be marked present at a missed practice, as the member', async () => {
    mocks.ledger.mockResolvedValue(ledgerWith(true))

    await expect(requestCorrectionAction({ practiceId: 5, note: '  Came late ' })).resolves.toEqual(
      { status: 'requested' },
    )

    expect(mocks.ledger).toHaveBeenCalledWith(
      { playerId: 114, token: 'jwt', isCaptain: false },
      new Date('2026-11-09T09:00:00Z'),
    )
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/attendance-corrections',
        auth: { as: 'member', token: 'jwt' },
        body: { practice: 5, player: 114, note: 'Came late' },
      }),
    )
  })

  it('refuses an empty note, a practice not missed, an unknown one, or no team', async () => {
    await expect(requestCorrectionAction({ practiceId: 5, note: ' ' })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.ledger.mockResolvedValueOnce(ledgerWith(false))
    await expect(requestCorrectionAction({ practiceId: 5, note: 'x' })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.ledger.mockResolvedValueOnce(ledgerWith(true))
    await expect(requestCorrectionAction({ practiceId: 6, note: 'x' })).resolves.toEqual({
      status: 'invalid',
    })

    mocks.ledger.mockResolvedValueOnce({ kind: 'no-squad' })
    await expect(requestCorrectionAction({ practiceId: 5, note: 'x' })).resolves.toEqual({
      status: 'invalid',
    })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('needs a linked member, and reports failures', async () => {
    mocks.member = { ...MEMBER, playerId: null }
    await expect(requestCorrectionAction({ practiceId: 5, note: 'x' })).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.member = MEMBER
    mocks.ledger.mockResolvedValue(ledgerWith(true))
    mocks.request.mockRejectedValueOnce(new BackendError(403, 'Forbidden'))
    await expect(requestCorrectionAction({ practiceId: 5, note: 'x' })).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.request.mockRejectedValueOnce(new Error('down'))
    await expect(requestCorrectionAction({ practiceId: 5, note: 'x' })).resolves.toEqual({
      status: 'error',
    })
    expect(mocks.logError).toHaveBeenCalled()
  })
})
