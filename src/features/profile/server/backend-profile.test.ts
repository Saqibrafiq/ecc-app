import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

const request = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: request }))
vi.mock('@/features/week', () => ({
  getClubTeams: () =>
    Promise.resolve(
      new Map([
        [1, { id: '1', name: 'ECC I' }],
        [14, { id: '14', name: 'ECC II' }],
      ]),
    ),
}))

const { getBackendProfile } = await import('./backend-profile')

const MEMBER: Member = {
  id: 27,
  email: 'ali@example.com',
  name: 'Ali Shaan',
  role: 'captain',
  playerId: 114,
  captainOfTeamId: 1,
}

beforeEach(() => {
  request.mockReset()
  request.mockResolvedValue({ name: 'Ali Shaan', squadTeam: 14 })
})

describe('getBackendProfile', () => {
  it('names the member’s team, the team they lead and their player record', async () => {
    await expect(getBackendProfile(MEMBER, 'jwt')).resolves.toEqual({
      name: 'Ali Shaan',
      email: 'ali@example.com',
      role: 'captain',
      teamName: 'ECC II',
      captainOfName: 'ECC I',
      playerName: 'Ali Shaan',
    })
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/players/114?depth=0',
        auth: { as: 'member', token: 'jwt' },
      }),
    )
  })

  it('falls back to the player name, and leads no team unless a captain', async () => {
    request.mockResolvedValue({ name: 'Ali S.', squadTeam: null })

    await expect(
      getBackendProfile({ ...MEMBER, name: null, role: 'player' }, 'jwt'),
    ).resolves.toMatchObject({ name: 'Ali S.', teamName: null, captainOfName: null })
  })

  it('shows an unlinked account by its email, without reading a player', async () => {
    await expect(
      getBackendProfile({ ...MEMBER, name: null, playerId: null, role: 'admin' }, 'jwt'),
    ).resolves.toMatchObject({ name: 'ali@example.com', playerName: null, teamName: null })
    expect(request).not.toHaveBeenCalled()
  })

  it('knows no name for a team that is not a club team', async () => {
    request.mockResolvedValue({ name: 'Ali Shaan', squadTeam: 99 })

    await expect(getBackendProfile(MEMBER, 'jwt')).resolves.toMatchObject({ teamName: null })
  })
})
