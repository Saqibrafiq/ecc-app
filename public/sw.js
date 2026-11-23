/**
 * The app's service worker: it shows Web Push notifications and opens the screen a notification
 * points to (ADR-0003). It caches nothing; the app always loads from the network.
 *
 * A push carries JSON: { title, body, url, tag }. `url` is a path inside the app; anything else
 * opens the week.
 */

const HOME = '/'
const ICON = '/icons/icon-192.png'

/** Only a path on this origin, never another site. */
function toAppPath(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : HOME
}

function readPayload(event) {
  try {
    return event.data ? event.data.json() : {}
  } catch {
    return { body: event.data ? event.data.text() : '' }
  }
}

// A new version takes over at once, and takes control of open pages, so a tap on a notification
// can move an open app to its screen. There is no fetch handler: control changes no request.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  const payload = readPayload(event)
  const title = typeof payload.title === 'string' ? payload.title : 'ECC'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      icon: ICON,
      badge: ICON,
      // A newer notification of the same kind replaces the older one instead of piling up.
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
      data: { url: toAppPath(payload.url) },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(toAppPath(event.notification.data?.url), self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (!open) return self.clients.openWindow(target)
      return open
        .navigate(target)
        .then((client) => (client ?? open).focus())
        .catch(() => self.clients.openWindow(target))
    }),
  )
})
