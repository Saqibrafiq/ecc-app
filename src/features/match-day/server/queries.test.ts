import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = { isConfigured: boolean; access: { kind: string; actor?: object }; load: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: true,
  access: { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } },
  load: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/team', async () => ({
  ...(await vi.importActual<typeof Team>('@/features/team')),
  getTeamAccess: () => Promise.resolve(mocks.access),
}))
vi.mock('./backend-match-day', () => ({ loadMatchDay: mocks.load }))

import type * as Team from '@/features/team'

const { getMatchDay } = await import('./queries')

beforeEach(() => {
  mocks.isConfigured = true
  mocks.access = { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } }
  mocks.load.mockReset()
})

describe('getMatchDay', () => {
  it('shows the sample match day in the preview, and nothing else', async () => {
    mocks.isConfigured = false

    const result = await getMatchDay(201)
    expect(result).toMatchObject({ kind: 'match-day', isPreview: true })
    expect(result.kind === 'match-day' && result.matchDay.players).toHaveLength(12)
    expect(result.kind === 'match-day' && result.matchDay.missingPasses).toHaveLength(1)
    await expect(getMatchDay(5)).resolves.toEqual({ kind: 'not-found' })
  })

  it('loads an approved squad for its captain or an admin', async () => {
    mocks.load.mockResolvedValue({ kind: 'ready', data: { matchDay: { fixtureId: 60 } } })

    await expect(getMatchDay(60)).resolves.toEqual({
      kind: 'match-day',
      matchDay: { fixtureId: 60 },
      isPreview: false,
    })
  })

  it('says why there is no match day', async () => {
    mocks.load.mockResolvedValueOnce({ kind: 'not-approved' })
    await expect(getMatchDay(60)).resolves.toEqual({ kind: 'not-approved' })

    mocks.load.mockResolvedValueOnce(null)
    await expect(getMatchDay(61)).resolves.toEqual({ kind: 'not-found' })

    mocks.access = { kind: 'not-captain' }
    await expect(getMatchDay(60)).resolves.toEqual({ kind: 'not-captain' })
  })
})
