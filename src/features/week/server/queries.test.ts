import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

const mocks = vi.hoisted(() => ({
  isConfigured: false,
  member: null as Member | null,
  token: null as string | null,
  backendWeek: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('./backend-week', () => ({ getBackendWeek: mocks.backendWeek }))

const { getMyWeek } = await import('./queries')

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
  mocks.backendWeek.mockReset()
})

describe('getMyWeek', () => {
  it('shows the preview with sample data without a backend', async () => {
    mocks.isConfigured = false

    const result = await getMyWeek()

    expect(result).toMatchObject({ kind: 'week', isPreview: true, memberName: 'Saqib Rafiq' })
    expect(mocks.backendWeek).not.toHaveBeenCalled()
  })

  it('sends a visitor without a session to sign in', async () => {
    mocks.member = null
    await expect(getMyWeek()).resolves.toEqual({ kind: 'signed-out' })

    mocks.member = MEMBER
    mocks.token = null
    await expect(getMyWeek()).resolves.toEqual({ kind: 'signed-out' })
  })

  it('tells a member whose account is not linked to a player', async () => {
    mocks.member = { ...MEMBER, playerId: null }

    await expect(getMyWeek()).resolves.toEqual({ kind: 'unlinked' })
  })

  it('passes on a member without a team squad', async () => {
    mocks.backendWeek.mockResolvedValue({ kind: 'no-squad' })

    await expect(getMyWeek()).resolves.toEqual({ kind: 'no-squad' })
  })

  it('returns the real week, named after the member (or their email)', async () => {
    const week = { days: [] }
    mocks.backendWeek.mockResolvedValue({ kind: 'week', week, nextMatch: null })

    await expect(getMyWeek()).resolves.toEqual({
      kind: 'week',
      week,
      memberName: 'Saqib Rafiq',
      isPreview: false,
      nextMatch: null,
    })
    expect(mocks.backendWeek).toHaveBeenCalledWith(
      { playerId: 52, token: 'jwt' },
      new Date('2026-11-09T09:00:00Z'),
    )

    mocks.member = { ...MEMBER, name: null }
    await expect(getMyWeek()).resolves.toMatchObject({ memberName: 'saqib@example.com' })
  })
})
