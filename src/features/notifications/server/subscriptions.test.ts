import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

type Call = { method?: string; path: string; auth: unknown; body?: unknown; schema: z.ZodType }
const request = vi.hoisted(() => vi.fn<(call: Call) => Promise<unknown>>())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: request }))

const { deleteSubscription, forgetSubscription, getSubscriptions, saveSubscription } =
  await import('./subscriptions')

const SUBSCRIPTION = {
  endpoint: 'https://push.example/abc',
  keys: { p256dh: 'BNc', auth: 'tBH' },
}
const doc = (id: number, user: number) => ({
  id,
  user,
  endpoint: SUBSCRIPTION.endpoint,
  p256dh: 'BNc',
  auth: 'tBH',
  locale: 'de',
})

let stored: ReturnType<typeof doc>[] = []
const calls = () => request.mock.calls.map(([call]) => call)

beforeEach(() => {
  stored = []
  request.mockReset()
  request.mockImplementation(({ method = 'GET', schema }: Call) =>
    Promise.resolve(schema.parse(method === 'GET' ? { docs: stored } : {})),
  )
})

describe('saveSubscription', () => {
  it('registers a new device for the member, as the service account', async () => {
    await saveSubscription(4, SUBSCRIPTION, 'iPhone · Safari', 'de')

    expect(calls().at(-1)).toMatchObject({
      method: 'POST',
      path: '/push-subscriptions',
      auth: { as: 'service' },
      body: {
        user: 4,
        endpoint: SUBSCRIPTION.endpoint,
        p256dh: 'BNc',
        auth: 'tBH',
        userAgent: 'iPhone · Safari',
        locale: 'de',
      },
    })
  })

  it('moves a known device to whoever is signed in on it now', async () => {
    stored = [doc(9, 7)]

    await saveSubscription(4, SUBSCRIPTION, 'iPhone · Safari', 'en')

    expect(calls().at(-1)).toMatchObject({
      method: 'PATCH',
      path: '/push-subscriptions/9',
      body: { user: 4 },
    })
  })
})

describe('forgetSubscription', () => {
  it("removes the member's device and leaves anyone else's alone", async () => {
    stored = [doc(9, 4), doc(10, 7)]

    await forgetSubscription(4, SUBSCRIPTION.endpoint)

    const deletes = calls().filter((call) => call.method === 'DELETE')
    expect(deletes.map((call) => call.path)).toEqual(['/push-subscriptions/9'])
  })
})

describe('getSubscriptions', () => {
  it("reads the members' devices, ready to send to", async () => {
    stored = [doc(9, 4)]

    await expect(getSubscriptions([4, 5])).resolves.toEqual([
      {
        id: 9,
        userId: 4,
        locale: 'de',
        endpoint: SUBSCRIPTION.endpoint,
        keys: { p256dh: 'BNc', auth: 'tBH' },
      },
    ])
    expect(new URLSearchParams(calls()[0]?.path.split('?')[1]).get('where[user][in]')).toBe('4,5')
  })

  it('asks nothing for nobody', async () => {
    await expect(getSubscriptions([])).resolves.toEqual([])
    expect(request).not.toHaveBeenCalled()
  })
})

describe('deleteSubscription', () => {
  it('deletes the device as the service account', async () => {
    await deleteSubscription(9)
    expect(calls()[0]).toMatchObject({
      method: 'DELETE',
      path: '/push-subscriptions/9',
      auth: { as: 'service' },
    })
  })
})
