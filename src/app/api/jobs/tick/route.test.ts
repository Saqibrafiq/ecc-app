// @vitest-environment node
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  env: { JOBS_SECRET?: string }
  isConfigured: boolean
  isSigned: Mock
  runTick: Mock
  logError: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  env: {},
  isConfigured: true,
  isSigned: vi.fn(),
  runTick: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('@/shared/config/env', () => ({ getServerEnv: () => mocks.env }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T10:07:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/features/jobs', () => ({ isSignedTick: mocks.isSigned, runTick: mocks.runTick }))

const { POST } = await import('./route')

const SECRET = 'x'.repeat(64)
const tick = () => POST(new Request('http://app.test/api/jobs/tick', { method: 'POST' }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.env = { JOBS_SECRET: SECRET }
  mocks.isConfigured = true
  mocks.isSigned.mockReturnValue(true)
  mocks.runTick.mockResolvedValue({ due: 1, alreadySent: 0, sent: 1 })
})

describe('POST /api/jobs/tick', () => {
  it("runs a signed tick at the app's time and reports what it did", async () => {
    const response = await tick()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ due: 1, alreadySent: 0, sent: 1 })
    expect(mocks.runTick).toHaveBeenCalledWith(new Date('2026-11-09T10:07:00Z'))
  })

  it('checks the signature against the real time, not a pinned development clock', async () => {
    const before = Date.now()
    await tick()

    const [, secret, checkedAt] = mocks.isSigned.mock.calls[0] as [Headers, string, Date]
    expect(secret).toBe(SECRET)
    expect(checkedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('refuses a request that is not signed by the scheduler', async () => {
    mocks.isSigned.mockReturnValue(false)

    expect((await tick()).status).toBe(401)
    expect(mocks.runTick).not.toHaveBeenCalled()
  })

  it('is off without a secret or a backend', async () => {
    mocks.env = {}
    expect((await tick()).status).toBe(503)

    mocks.env = { JOBS_SECRET: SECRET }
    mocks.isConfigured = false
    expect((await tick()).status).toBe(503)
    expect(mocks.runTick).not.toHaveBeenCalled()
  })

  it('logs a failed tick and says so', async () => {
    mocks.runTick.mockRejectedValueOnce(new Error('backend down'))

    expect((await tick()).status).toBe(500)
    expect(mocks.logError).toHaveBeenCalledWith('The scheduled tick failed', expect.any(Error))
  })
})
