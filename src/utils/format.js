export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

const LOSSLESS_EXTENSIONS = new Set(['flac', 'wav'])

export function qualityLabel(track) {
  if (!track) return ''
  const ext = (track.extension || '').toLowerCase()
  if (LOSSLESS_EXTENSIONS.has(ext)) return `${ext.toUpperCase()} · Lossless`
  if (track.duration > 0 && track.size > 0) {
    const kbps = Math.round((track.size * 8) / track.duration / 1000)
    return `${ext.toUpperCase()} · ~${kbps} kbps`
  }
  return ext.toUpperCase()
}

export function isLossless(track) {
  return LOSSLESS_EXTENSIONS.has((track?.extension || '').toLowerCase())
}
