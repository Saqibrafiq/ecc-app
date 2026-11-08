import { describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = { member: Member | null; token: string | null }

const mocks = vi.hoisted<Mocks>(() => ({ member: null, token: 'jwt' }))

vi.mock('server-only', () => ({}))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))

const { getCaptainAccess } = await import('./captain')

const MEMBER: Member = {
  id: 27,
  email: 'captain@example.com',
  name: 'Ali Shaan',
  role: 'captain',
  playerId: 114,
  captainOfTeamId: 1,
}

describe('getCaptainAccess', () => {
  it('lets a captain in for the team they lead', async () => {
    mocks.member = MEMBER
    await expect(getCaptainAccess()).resolves.toEqual({
      kind: 'captain',
      captain: { teamId: 1, token: 'jwt' },
    })
  })

  it('keeps out players, admins and captains without a team', async () => {
    for (const member of [
      { ...MEMBER, role: 'player' as const },
      { ...MEMBER, role: 'admin' as const },
      { ...MEMBER, captainOfTeamId: null },
    ]) {
      mocks.member = member
      await expect(getCaptainAccess()).resolves.toEqual({ kind: 'not-captain' })
    }
  })

  it('needs a session', async () => {
    mocks.member = null
    await expect(getCaptainAccess()).resolves.toEqual({ kind: 'signed-out' })

    mocks.member = MEMBER
    mocks.token = null
    await expect(getCaptainAccess()).resolves.toEqual({ kind: 'signed-out' })
  })
})
