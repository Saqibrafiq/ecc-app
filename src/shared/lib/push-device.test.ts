import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDeviceSubscription,
  getServiceWorker,
  isPushSupported,
  needsHomeScreenInstall,
  toApplicationServerKey,
  unsubscribeDevice,
} from './push-device'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/604.1'
const PIXEL = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/131.0 Mobile Safari/537.36'

function fakeSubscription() {
  return { endpoint: 'https://push.example/abc', unsubscribe: vi.fn(() => Promise.resolve(true)) }
}

function installPush(subscription: ReturnType<typeof fakeSubscription> | null) {
  const registration = { pushManager: { getSubscription: () => Promise.resolve(subscription) } }
  const serviceWorker = {
    register: vi.fn(() => Promise.resolve(registration)),
    ready: Promise.resolve(registration),
    getRegistration: vi.fn(() => Promise.resolve(registration)),
  }
  vi.stubGlobal('navigator', { serviceWorker, userAgent: PIXEL })
  vi.stubGlobal('PushManager', vi.fn())
  vi.stubGlobal('Notification', vi.fn())
  return { serviceWorker, registration }
}

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: PIXEL })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isPushSupported', () => {
  it('needs a service worker, push and notifications', () => {
    expect(isPushSupported()).toBe(false)
    installPush(null)
    expect(isPushSupported()).toBe(true)
  })
})

describe('needsHomeScreenInstall', () => {
  it('asks an iPhone in a browser tab to add the app to the Home Screen first', () => {
    vi.stubGlobal('navigator', { userAgent: IPHONE })
    expect(needsHomeScreenInstall()).toBe(true)

    vi.stubGlobal('navigator', { userAgent: IPHONE, standalone: true })
    expect(needsHomeScreenInstall()).toBe(false)
  })

  it('does not ask an Android phone, or an app opened from the Home Screen', () => {
    expect(needsHomeScreenInstall()).toBe(false)

    vi.stubGlobal('navigator', { userAgent: IPHONE })
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(needsHomeScreenInstall()).toBe(false)
  })
})

describe('the service worker and the device subscription', () => {
  it('registers the app worker for the whole app, without the HTTP cache', async () => {
    const { serviceWorker, registration } = installPush(null)

    await expect(getServiceWorker()).resolves.toBe(registration)
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
  })

  it('reads and ends the device subscription', async () => {
    const subscription = fakeSubscription()
    installPush(subscription)

    await expect(getDeviceSubscription()).resolves.toBe(subscription)
    await expect(unsubscribeDevice()).resolves.toBe('https://push.example/abc')
    expect(subscription.unsubscribe).toHaveBeenCalled()
  })

  it('has nothing to read or end without a subscription, a worker or push support', async () => {
    const { serviceWorker } = installPush(null)
    await expect(unsubscribeDevice()).resolves.toBeNull()

    serviceWorker.getRegistration.mockResolvedValueOnce(undefined as never)
    await expect(getDeviceSubscription()).resolves.toBeNull()

    vi.stubGlobal('navigator', { userAgent: PIXEL })
    await expect(getDeviceSubscription()).resolves.toBeNull()
  })
})

describe('toApplicationServerKey', () => {
  it('decodes base64url, padding included', () => {
    expect([...toApplicationServerKey('-_8')]).toEqual([251, 255])
    expect([...toApplicationServerKey('AQID')]).toEqual([1, 2, 3])
  })
})
