import { beforeEach, describe, expect, it, vi } from 'vitest'

type Mocks = { env: Record<string, string | undefined>; send: ReturnType<typeof vi.fn> }
const mocks = vi.hoisted<Mocks>(() => ({ env: {}, send: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => mocks.env }))
vi.mock('@/shared/lib/log', () => ({ logError: vi.fn() }))
vi.mock('./subscriptions', () => ({ deleteSubscription: vi.fn(() => Promise.resolve()) }))
vi.mock('web-push', async () => {
  const actual = await vi.importActual<typeof WebPush>('web-push')
  return { WebPushError: actual.WebPushError, sendNotification: mocks.send }
})

import type * as WebPush from 'web-push'

const { WebPushError } = await import('web-push')
const { deleteSubscription } = await import('./subscriptions')
const { logError } = await import('@/shared/lib/log')
const { getPushPublicKey, sendPush } = await import('./send-push')

const VAPID = {
  VAPID_PUBLIC_KEY: 'public',
  VAPID_PRIVATE_KEY: 'private',
  VAPID_SUBJECT: 'https://erlangen-cricket-club.vercel.app',
}
const device = (id: number) => ({
  id,
  userId: 4,
  endpoint: `https://push.example/${String(id)}`,
  keys: { p256dh: 'BNc', auth: 'tBH' },
})
const MESSAGE = { title: 'ECC', body: 'Answer for Saturday', url: '/', tag: 'reminder' }
const pushError = (status: number) =>
  new WebPushError('refused', status, {}, '', 'https://push.example')

beforeEach(() => {
  mocks.env = { ...VAPID }
  mocks.send.mockReset()
  mocks.send.mockResolvedValue({ statusCode: 201 })
  vi.mocked(deleteSubscription).mockClear()
  vi.mocked(logError).mockClear()
})

describe('getPushPublicKey', () => {
  it('hands out the public key only when this server can send', () => {
    expect(getPushPublicKey()).toBe('public')
    mocks.env = {}
    expect(getPushPublicKey()).toBeNull()
  })
})

describe('sendPush', () => {
  it('sends the message to every device, signed and short-lived', async () => {
    await expect(sendPush([device(1), device(2)], MESSAGE)).resolves.toEqual({
      sent: 2,
      expired: 0,
      failed: 0,
    })
    expect(mocks.send).toHaveBeenCalledWith(device(1), JSON.stringify(MESSAGE), {
      vapidDetails: { subject: VAPID.VAPID_SUBJECT, publicKey: 'public', privateKey: 'private' },
      TTL: 86_400,
      urgency: 'normal',
    })
  })

  it('removes devices the push service no longer knows, and goes on after a failure', async () => {
    mocks.send
      .mockRejectedValueOnce(pushError(410))
      .mockRejectedValueOnce(pushError(404))
      .mockRejectedValueOnce(pushError(500))
      .mockRejectedValueOnce(new Error('offline'))

    await expect(
      sendPush([device(1), device(2), device(3), device(4), device(5)], MESSAGE),
    ).resolves.toEqual({ sent: 1, expired: 2, failed: 2 })
    expect(vi.mocked(deleteSubscription).mock.calls).toEqual([[1], [2]])
    expect(logError).toHaveBeenCalledTimes(2)
  })

  it('sends nothing without a key pair', async () => {
    mocks.env = {}
    await expect(sendPush([device(1)], MESSAGE)).resolves.toEqual({
      sent: 0,
      expired: 0,
      failed: 1,
    })
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
