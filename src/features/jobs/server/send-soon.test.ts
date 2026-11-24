import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  after: Mock<(task: () => Promise<void>) => void>
  isConfigured: boolean
  publicKey: string | null
  runTick: Mock
  logError: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  after: vi.fn(),
  isConfigured: true,
  publicKey: 'public-key',
  runTick: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: mocks.after }))
vi.mock('@/features/notifications', () => ({ getPushPublicKey: () => mocks.publicKey }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-12T19:00:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('./run-tick', () => ({ runTick: mocks.runTick }))

const { sendDueNotificationsSoon } = await import('./send-soon')

/** Runs what was handed to `after`, as Next.js does once the response has gone out. */
async function finishResponse() {
  const [task] = mocks.after.mock.calls[0] ?? []
  await task?.()
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isConfigured = true
  mocks.publicKey = 'public-key'
  mocks.runTick.mockResolvedValue({ due: 1, alreadySent: 0, sent: 1 })
})

describe('sendDueNotificationsSoon', () => {
  it("runs a tick at the app's time once the response has gone out", async () => {
    sendDueNotificationsSoon()
    expect(mocks.runTick).not.toHaveBeenCalled()

    await finishResponse()
    expect(mocks.runTick).toHaveBeenCalledWith(new Date('2026-11-12T19:00:00Z'))
  })

  it('logs a failed tick and leaves the change itself alone', async () => {
    mocks.runTick.mockRejectedValueOnce(new Error('push service down'))

    sendDueNotificationsSoon()
    await finishResponse()

    expect(mocks.logError).toHaveBeenCalledWith(
      'Sending notifications after a change failed',
      expect.any(Error),
    )
  })

  it('does nothing in the preview or without push keys', () => {
    mocks.isConfigured = false
    sendDueNotificationsSoon()

    mocks.isConfigured = true
    mocks.publicKey = null
    sendDueNotificationsSoon()

    expect(mocks.after).not.toHaveBeenCalled()
  })
})
