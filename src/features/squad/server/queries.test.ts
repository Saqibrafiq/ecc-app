import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  isConfigured: boolean
  member: { playerId: number | null } | null
  token: string | null
  load: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: true,
  member: { playerId: 52 },
  token: 'jwt',
  load: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('./backend-squad', () => ({ loadTeamSheet: mocks.load }))

const { getTeamSheet } = await import('./queries')

beforeEach(() => {
  mocks.isConfigured = true
  mocks.member = { playerId: 52 }
  mocks.token = 'jwt'
  mocks.load.mockReset()
})

describe('getTeamSheet', () => {
  it('shows the sample team sheet in the preview, with the sample member picked', async () => {
    mocks.isConfigured = false

    const result = await getTeamSheet(201)
    if (result.kind !== 'sheet') throw new Error('expected a sheet')
    expect(result.isPreview).toBe(true)
    expect(result.sheet.players.map((player) => player.role)).toEqual([
      ...Array<string>(11).fill('playing'),
      'twelfth',
      'reserve',
    ])
    expect(result.sheet.players.filter((player) => player.isViewer)).toHaveLength(1)
    await expect(getTeamSheet(5)).resolves.toEqual({ kind: 'not-found' })
  })

  it("loads the announced squad with the member's session and player", async () => {
    mocks.load.mockResolvedValue({ kind: 'sheet', sheet: { fixtureId: 60 } })

    await expect(getTeamSheet(60)).resolves.toEqual({
      kind: 'sheet',
      sheet: { fixtureId: 60 },
      isPreview: false,
    })
    expect(mocks.load).toHaveBeenCalledWith({ token: 'jwt', playerId: 52 }, 60)
  })

  it('passes on a squad not announced yet, or no such match', async () => {
    mocks.load.mockResolvedValueOnce({ kind: 'not-announced' })
    await expect(getTeamSheet(60)).resolves.toEqual({ kind: 'not-announced' })
  })

  it('sends a signed-out visitor to sign in', async () => {
    mocks.member = null
    await expect(getTeamSheet(60)).resolves.toEqual({ kind: 'signed-out' })

    mocks.member = { playerId: 52 }
    mocks.token = null
    await expect(getTeamSheet(60)).resolves.toEqual({ kind: 'signed-out' })
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
