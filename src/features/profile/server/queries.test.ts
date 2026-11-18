import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = { isConfigured: boolean; member: Member | null; token: string | null }

const mocks = vi.hoisted<Mocks>(() => ({ isConfigured: true, member: null, token: 'jwt' }))
const profile = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('./backend-profile', () => ({ getBackendProfile: profile }))

const { getMyProfile } = await import('./queries')

const MEMBER: Member = {
  id: 4,
  email: 'saqib@example.com',
  name: 'Saqib Rafiq',
  role: 'admin',
  playerId: 52,
  captainOfTeamId: null,
}

beforeEach(() => {
  mocks.isConfigured = true
  mocks.member = MEMBER
  mocks.token = 'jwt'
  profile.mockReset()
})

describe('getMyProfile', () => {
  it('shows the sample member in the preview', async () => {
    mocks.isConfigured = false

    await expect(getMyProfile()).resolves.toMatchObject({
      kind: 'profile',
      isPreview: true,
      profile: { name: 'Saqib Rafiq', role: 'captain' },
    })
  })

  it('reads the signed-in member’s profile with their session', async () => {
    profile.mockResolvedValue({ name: 'Saqib Rafiq' })

    await expect(getMyProfile()).resolves.toEqual({
      kind: 'profile',
      profile: { name: 'Saqib Rafiq' },
      isPreview: false,
    })
    expect(profile).toHaveBeenCalledWith(MEMBER, 'jwt')
  })

  it('sends a visitor without a session to sign in', async () => {
    mocks.token = null

    await expect(getMyProfile()).resolves.toEqual({ kind: 'signed-out' })
  })
})
