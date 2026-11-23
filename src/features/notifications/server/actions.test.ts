import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  member: { id: number } | null
  vapid: object | null
  save: Mock
  forget: Mock
  getSubscriptions: Mock
  send: Mock
  logError: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  member: { id: 4 },
  vapid: { publicKey: 'public' },
  save: vi.fn(),
  forget: vi.fn(),
  getSubscriptions: vi.fn(),
  send: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/features/auth', () => ({ getCurrentMember: () => Promise.resolve(mocks.member) }))
vi.mock('next-intl/server', () => ({
  getTranslations: () => Promise.resolve((key: string) => `test.${key}`),
  getLocale: () => Promise.resolve('de'),
}))
vi.mock('./send-push', () => ({ getVapidDetails: () => mocks.vapid, sendPush: mocks.send }))
vi.mock('./subscriptions', () => ({
  saveSubscription: mocks.save,
  forgetSubscription: mocks.forget,
  getSubscriptions: mocks.getSubscriptions,
}))

const { forgetPushSubscriptionAction, savePushSubscriptionAction, sendTestPushAction } =
  await import('./actions')

const SUBSCRIPTION = {
  endpoint: 'https://push.example/abc',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4', auth: 'tBHItJI5svbpez7KI4CCXg' },
  expirationTime: null,
}
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Safari/604.1'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.member = { id: 4 }
  mocks.vapid = { publicKey: 'public' }
  mocks.save.mockResolvedValue(undefined)
  mocks.forget.mockResolvedValue(undefined)
  mocks.getSubscriptions.mockResolvedValue([{ id: 9 }])
  mocks.send.mockResolvedValue({ sent: 1, expired: 0, failed: 0 })
})

describe('savePushSubscriptionAction', () => {
  it('registers the device for the signed-in member, named by its kind, in its language', async () => {
    await expect(
      savePushSubscriptionAction({ subscription: SUBSCRIPTION, userAgent: IPHONE }),
    ).resolves.toEqual({ status: 'saved' })
    expect(mocks.save).toHaveBeenCalledWith(
      4,
      { endpoint: SUBSCRIPTION.endpoint, keys: SUBSCRIPTION.keys },
      'iPhone · Safari',
      'de',
    )
  })

  it('refuses a malformed subscription, a server without keys and a signed-out visitor', async () => {
    await expect(
      savePushSubscriptionAction({ subscription: { endpoint: 'nope' }, userAgent: IPHONE }),
    ).resolves.toEqual({ status: 'invalid' })

    const input = { subscription: SUBSCRIPTION, userAgent: IPHONE }
    mocks.vapid = null
    await expect(savePushSubscriptionAction(input)).resolves.toEqual({ status: 'unavailable' })

    mocks.vapid = { publicKey: 'public' }
    mocks.member = null
    await expect(savePushSubscriptionAction(input)).resolves.toEqual({ status: 'unauthorized' })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('reports and logs a failed save', async () => {
    mocks.save.mockRejectedValueOnce(new Error('down'))
    await expect(
      savePushSubscriptionAction({ subscription: SUBSCRIPTION, userAgent: IPHONE }),
    ).resolves.toEqual({ status: 'error' })
    expect(mocks.logError).toHaveBeenCalled()
  })
})

describe('forgetPushSubscriptionAction', () => {
  it("removes the signed-in member's device", async () => {
    await expect(forgetPushSubscriptionAction(SUBSCRIPTION.endpoint)).resolves.toEqual({
      status: 'forgotten',
    })
    expect(mocks.forget).toHaveBeenCalledWith(4, SUBSCRIPTION.endpoint)
  })

  it('refuses a bad endpoint and a signed-out visitor, and reports a failure', async () => {
    await expect(forgetPushSubscriptionAction(42)).resolves.toEqual({ status: 'invalid' })

    mocks.member = null
    await expect(forgetPushSubscriptionAction(SUBSCRIPTION.endpoint)).resolves.toEqual({
      status: 'unauthorized',
    })

    mocks.member = { id: 4 }
    mocks.forget.mockRejectedValueOnce(new Error('down'))
    await expect(forgetPushSubscriptionAction(SUBSCRIPTION.endpoint)).resolves.toEqual({
      status: 'error',
    })
  })
})

describe('sendTestPushAction', () => {
  it("sends a test to the member's devices, in their language, opening the profile", async () => {
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'sent' })
    expect(mocks.getSubscriptions).toHaveBeenCalledWith([4])
    expect(mocks.send).toHaveBeenCalledWith([{ id: 9 }], {
      title: 'test.title',
      body: 'test.body',
      url: '/profile',
      tag: 'test',
    })
  })

  it('says when there is no device, or every device has expired', async () => {
    mocks.getSubscriptions.mockResolvedValueOnce([])
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'no-device' })

    mocks.send.mockResolvedValueOnce({ sent: 0, expired: 1, failed: 0 })
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'no-device' })
  })

  it('reports failures, a server without keys and a signed-out visitor', async () => {
    mocks.send.mockResolvedValueOnce({ sent: 0, expired: 0, failed: 1 })
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'error' })

    mocks.getSubscriptions.mockRejectedValueOnce(new Error('down'))
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'error' })
    expect(mocks.logError).toHaveBeenCalled()

    mocks.vapid = null
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'unavailable' })

    mocks.vapid = { publicKey: 'public' }
    mocks.member = null
    await expect(sendTestPushAction()).resolves.toEqual({ status: 'unauthorized' })
  })
})
