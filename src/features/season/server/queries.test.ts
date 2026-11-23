import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'

type Mocks = {
  isConfigured: boolean
  member: Member | null
  token: string | null
  backendSeason: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: false,
  member: null,
  token: null,
  backendSeason: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('./backend-season', () => ({ getBackendSeason: mocks.backendSeason }))

const { getMySeason } = await import('./queries')

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
  mocks.backendSeason.mockReset()
})

describe('getMySeason', () => {
  it('shows the sample season around the preview Monday without a backend', async () => {
    mocks.isConfigured = false

    const result = await getMySeason()

    expect(result).toMatchObject({ kind: 'season', isPreview: true })
    if (result.kind !== 'season') throw new Error('expected a season')
    expect(result.season.nextDate).toBe('2026-11-14')
    expect(result.season.record).toMatchObject({ team: { name: 'ECC I' }, played: 4, won: 3 })
    expect(mocks.backendSeason).not.toHaveBeenCalled()
  })

  it("reads the signed-in member's season from the backend", async () => {
    const season = { year: 2026, today: '2026-11-09', months: [], nextDate: null, record: null }
    mocks.backendSeason.mockResolvedValue(season)

    await expect(getMySeason()).resolves.toEqual({ kind: 'season', season, isPreview: false })
    expect(mocks.backendSeason).toHaveBeenCalledWith(
      { token: 'jwt', playerId: 52 },
      new Date('2026-11-09T09:00:00Z'),
    )
  })

  it('asks a signed-out visitor to sign in', async () => {
    mocks.member = null
    await expect(getMySeason()).resolves.toEqual({ kind: 'signed-out' })

    mocks.member = MEMBER
    mocks.token = null
    await expect(getMySeason()).resolves.toEqual({ kind: 'signed-out' })
  })
})
