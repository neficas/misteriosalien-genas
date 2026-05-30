import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

clientsClaim()
self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ─── Push notification handler ───────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification('Urantia — ' + data.title, {
      body: data.body || data.title,
      icon: '/misteriosalien-genas/icons/icon-192.png',
      badge: '/misteriosalien-genas/icons/icon-192.png',
      vibrate: [300, 150, 300, 150, 600],
      tag: data.id,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { id: data.id, type: data.type },
    })
  )
})

// ─── Notification click → open app ──────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = '/misteriosalien-genas/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('misteriosalien-genas') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
