/**
 * This browser's side of Web Push (ADR-0003): whether it can, the app's service worker, and the
 * device's subscription. Browser-only; call from effects and event handlers.
 */

const SERVICE_WORKER_URL = '/sw.js'
const IOS_DEVICE = /iPad|iPhone|iPod/

/** Whether this browser can receive push notifications at all. */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * An iPhone or iPad in a browser tab: Safari only offers push to the app once it is added to the
 * Home Screen and opened from there.
 */
export function needsHomeScreenInstall(): boolean {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return IOS_DEVICE.test(navigator.userAgent) && !isStandalone
}

/** Registers the app's service worker (idempotent) and waits until it is active. */
export async function getServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/', updateViaCache: 'none' })
  return navigator.serviceWorker.ready
}

/** This device's push subscription, if it has one. */
export async function getDeviceSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

/** The VAPID public key (base64url) as the bytes `pushManager.subscribe` expects. */
export function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4))
    .replaceAll('-', '+')
    .replaceAll('_', '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

/** Ends this device's subscription at the push service; returns its endpoint, if it had one. */
export async function unsubscribeDevice(): Promise<string | null> {
  const subscription = await getDeviceSubscription()
  if (!subscription) return null
  await subscription.unsubscribe()
  return subscription.endpoint
}
