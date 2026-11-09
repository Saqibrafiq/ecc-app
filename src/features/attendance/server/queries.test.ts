import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = { isConfigured: boolean; member: Member | null; token: string | null; ledger: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: true,
  member: null,
  token: 'jwt',
  ledger: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('./backend-attendance', () => ({ getBackendLedger: mocks.ledger }))

const { getMyLedger } = await import('./queries')

const MEMBER: Member = {
  id: 27,
  email: 'player@example.com',
  name: 'Ali Shaan',
  role: 'captain',
  playerId: 114,
  captainOfTeamId: 1,
}

beforeEach(() => {
  mocks.isConfigured = true
  mocks.member = MEMBER
  mocks.token = 'jwt'
  mocks.ledger.mockReset()
})

describe('getMyLedger', () => {
  it('shows sample data in the preview', async () => {
    mocks.isConfigured = false

    const result = await getMyLedger()

    expect(result).toMatchObject({ kind: 'ledger', isPreview: true, ledger: { season: '2026' } })
    expect(mocks.ledger).not.toHaveBeenCalled()
  })

  it("reads the member's season as them, captains with their target", async () => {
    mocks.ledger.mockResolvedValue({ kind: 'ledger', ledger: { season: '2026' } })

    await expect(getMyLedger()).resolves.toEqual({
      kind: 'ledger',
      ledger: { season: '2026' },
      isPreview: false,
    })
    expect(mocks.ledger).toHaveBeenCalledWith(
      { playerId: 114, token: 'jwt', isCaptain: true },
      new Date('2026-11-09T09:00:00Z'),
    )
  })

  it('tells a signed-out, unlinked or squad-less member why there is nothing', async () => {
    mocks.ledger.mockResolvedValue({ kind: 'no-squad' })
    await expect(getMyLedger()).resolves.toEqual({ kind: 'no-squad' })

    mocks.member = { ...MEMBER, playerId: null }
    await expect(getMyLedger()).resolves.toEqual({ kind: 'unlinked' })

    mocks.token = null
    await expect(getMyLedger()).resolves.toEqual({ kind: 'signed-out' })
  })
})
