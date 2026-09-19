const SHARE_CACHE = 'aural-share-target'

export async function consumeSharedFiles() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('shared') !== '1') return []
  window.history.replaceState({}, '', window.location.pathname)

  if (!('caches' in window)) return []

  const cache = await caches.open(SHARE_CACHE)
  const manifestRes = await cache.match('/__shared_manifest__')
  if (!manifestRes) return []

  const keys = await manifestRes.json()
  const files = []

  for (const key of keys) {
    const res = await cache.match(key)
    if (!res) continue
    const blob = await res.blob()
    const name = decodeURIComponent(res.headers.get('X-File-Name') || 'audio')
    files.push(new File([blob], name, { type: blob.type }))
    await cache.delete(key)
  }

  await cache.delete('/__shared_manifest__')
  return files
}
