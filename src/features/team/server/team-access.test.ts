import { describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = { member: Member | null; token: string | null }

const mocks = vi.hoisted<Mocks>(() => ({ member: null, token: 'jwt' }))

vi.mock('server-only', () => ({}))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))

const { canManageTeam, getTeamAccess } = await import('./team-access')

const MEMBER: Member = {
  id: 27,
  email: 'captain@example.com',
  name: 'Ali Shaan',
  role: 'captain',
  playerId: 114,
  captainOfTeamId: 1,
}

describe('getTeamAccess', () => {
  it('lets a captain in for the team they lead', async () => {
    mocks.member = MEMBER
    await expect(getTeamAccess()).resolves.toEqual({
      kind: 'allowed',
      actor: { token: 'jwt', teamId: 1, isAdmin: false },
    })
  })

  it('lets an admin in for every team', async () => {
    mocks.member = { ...MEMBER, role: 'admin', captainOfTeamId: null }
    await expect(getTeamAccess()).resolves.toEqual({
      kind: 'allowed',
      actor: { token: 'jwt', teamId: null, isAdmin: true },
    })
  })

  it('keeps out players and captains without a team', async () => {
    for (const member of [
      { ...MEMBER, role: 'player' as const },
      { ...MEMBER, captainOfTeamId: null },
    ]) {
      mocks.member = member
      await expect(getTeamAccess()).resolves.toEqual({ kind: 'not-captain' })
    }
  })

  it('needs a session', async () => {
    mocks.member = null
    await expect(getTeamAccess()).resolves.toEqual({ kind: 'signed-out' })

    mocks.member = MEMBER
    mocks.token = null
    await expect(getTeamAccess()).resolves.toEqual({ kind: 'signed-out' })
  })
})

describe('canManageTeam', () => {
  it('allows a captain their own team and an admin any team', () => {
    expect(canManageTeam({ token: 't', teamId: 1, isAdmin: false }, 1)).toBe(true)
    expect(canManageTeam({ token: 't', teamId: 1, isAdmin: false }, 14)).toBe(false)
    expect(canManageTeam({ token: 't', teamId: null, isAdmin: true }, 14)).toBe(true)
  })
})
