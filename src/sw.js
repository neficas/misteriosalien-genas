import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// --- Web Share Target ---------------------------------------------------
// Lets other apps (Files, Gallery, a music player, WhatsApp, ...) push
// audio files into Aural via Android's native "Share" sheet. This is the
// robust import path for devices whose <input type="file"> picker has no
// app registered to browse local storage for GET_CONTENT.

const SHARE_CACHE = 'aural-share-target'
const SHARE_PATH = '/misteriosalien-genas/share-target/'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === SHARE_PATH) {
    event.respondWith(handleShareTarget(event.request))
  }
})

async function handleShareTarget(request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('audio')
    const cache = await caches.open(SHARE_CACHE)
    const keys = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof File)) continue
      const key = `/__shared__/${Date.now()}-${i}`
      await cache.put(
        key,
        new Response(file, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name || `audio-${i}`),
          },
        }),
      )
      keys.push(key)
    }

    await cache.put('/__shared_manifest__', new Response(JSON.stringify(keys)))
  } catch {
    // A malformed share payload should never break the redirect back to
    // the app — the app-side handler simply finds nothing to import.
  }

  return Response.redirect('/misteriosalien-genas/?shared=1', 303)
}
