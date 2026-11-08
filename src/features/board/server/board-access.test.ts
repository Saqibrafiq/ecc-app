import { describe, expect, it, vi } from 'vitest'

import type { TeamActor } from '@/features/team'

type Access =
  { kind: 'allowed'; actor: TeamActor } | { kind: 'signed-out' } | { kind: 'not-captain' }

const mocks = vi.hoisted<{ access: Access }>(() => ({ access: { kind: 'signed-out' } }))

vi.mock('server-only', () => ({}))
vi.mock('@/features/team', () => ({ getTeamAccess: () => Promise.resolve(mocks.access) }))

const { getBoardAccess } = await import('./board-access')

describe('getBoardAccess', () => {
  it('lets admins in', async () => {
    const actor = { token: 'jwt', teamId: null, isAdmin: true }
    mocks.access = { kind: 'allowed', actor }
    await expect(getBoardAccess()).resolves.toEqual({ kind: 'board', actor })
  })

  it('keeps captains and players out, and needs a session', async () => {
    mocks.access = { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } }
    await expect(getBoardAccess()).resolves.toEqual({ kind: 'not-board' })

    mocks.access = { kind: 'not-captain' }
    await expect(getBoardAccess()).resolves.toEqual({ kind: 'not-board' })

    mocks.access = { kind: 'signed-out' }
    await expect(getBoardAccess()).resolves.toEqual({ kind: 'signed-out' })
  })
})
