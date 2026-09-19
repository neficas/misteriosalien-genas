// Lightweight, dependency-free tag readers for the formats browsers can
// natively decode (MP3 via ID3v2, FLAC via Vorbis comments). Anything else
// falls back to filename-derived metadata — no external parser needed.

const textDecoder = (encodingByte) => {
  switch (encodingByte) {
    case 1:
      return new TextDecoder('utf-16')
    case 2:
      return new TextDecoder('utf-16be')
    case 3:
      return new TextDecoder('utf-8')
    default:
      return new TextDecoder('iso-8859-1')
  }
}

function readSynchsafe(bytes, offset) {
  return (
    (bytes[offset] << 21) |
    (bytes[offset + 1] << 14) |
    (bytes[offset + 2] << 7) |
    bytes[offset + 3]
  )
}

function readUint32BE(bytes, offset) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0
}

function stripNulls(str) {
  // eslint-disable-next-line no-control-regex -- ID3 text frames are null-padded
  return str.replace(/\u0000+$/g, '').trim()
}

function parseId3v2(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return null
  }
  const majorVersion = bytes[3]
  const tagSize = readSynchsafe(bytes, 6)
  const end = Math.min(10 + tagSize, bytes.length)
  const result = {}
  let offset = 10

  while (offset + 10 <= end) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])
    if (id === '\u0000\u0000\u0000\u0000') break

    let frameSize
    if (majorVersion >= 4) {
      frameSize = readSynchsafe(bytes, offset + 4)
    } else {
      frameSize = readUint32BE(bytes, offset + 4)
    }
    const frameStart = offset + 10
    if (frameSize <= 0 || frameStart + frameSize > bytes.length) break

    const frameBytes = bytes.subarray(frameStart, frameStart + frameSize)

    if (id === 'TIT2' || id === 'TPE1' || id === 'TALB' || id === 'TCON' || id === 'TDRC' || id === 'TYER') {
      const encoding = frameBytes[0]
      const decoder = textDecoder(encoding)
      const text = stripNulls(decoder.decode(frameBytes.subarray(1)))
      if (id === 'TIT2') result.title = text
      if (id === 'TPE1') result.artist = text
      if (id === 'TALB') result.album = text
      if (id === 'TCON') result.genre = text
      if (id === 'TDRC' || id === 'TYER') result.year = text
    } else if (id === 'APIC') {
      let p = 1
      const encoding = frameBytes[0]
      let mimeEnd = frameBytes.indexOf(0, p)
      if (mimeEnd === -1) mimeEnd = p
      const mime = new TextDecoder('iso-8859-1').decode(frameBytes.subarray(p, mimeEnd)) || 'image/jpeg'
      p = mimeEnd + 1
      p += 1 // picture type byte
      const descDecoder = textDecoder(encoding)
      let descEnd = p
      if (encoding === 1 || encoding === 2) {
        while (descEnd + 1 < frameBytes.length && !(frameBytes[descEnd] === 0 && frameBytes[descEnd + 1] === 0)) {
          descEnd += 2
        }
        descEnd += 2
      } else {
        descEnd = frameBytes.indexOf(0, p)
        if (descEnd === -1) descEnd = p
        descEnd += 1
      }
      const imageData = frameBytes.subarray(descEnd)
      if (imageData.length > 0) {
        result.picture = new Blob([imageData], { type: mime })
      }
      void descDecoder
    }

    offset = frameStart + frameSize
  }

  return result
}

function readLE32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

function parseFlac(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 4 || bytes[0] !== 0x66 || bytes[1] !== 0x4c || bytes[2] !== 0x61 || bytes[3] !== 0x43) {
    return null
  }
  const result = {}
  let offset = 4
  let last = false

  while (!last && offset + 4 <= bytes.length) {
    const header = bytes[offset]
    last = (header & 0x80) !== 0
    const type = header & 0x7f
    const length = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]
    const blockStart = offset + 4
    if (blockStart + length > bytes.length) break

    if (type === 4) {
      // VORBIS_COMMENT
      let p = blockStart
      const vendorLen = readLE32(bytes, p)
      p += 4 + vendorLen
      const count = readLE32(bytes, p)
      p += 4
      for (let i = 0; i < count && p + 4 <= bytes.length; i++) {
        const len = readLE32(bytes, p)
        p += 4
        const comment = new TextDecoder('utf-8').decode(bytes.subarray(p, p + len))
        p += len
        const eq = comment.indexOf('=')
        if (eq > -1) {
          const key = comment.slice(0, eq).toUpperCase()
          const value = comment.slice(eq + 1)
          if (key === 'TITLE') result.title = value
          if (key === 'ARTIST') result.artist = value
          if (key === 'ALBUM') result.album = value
          if (key === 'GENRE') result.genre = value
          if (key === 'DATE') result.year = value
        }
      }
    } else if (type === 6) {
      // PICTURE
      let p = blockStart
      p += 4 // picture type
      const mimeLen = readUint32BE(bytes, p)
      p += 4
      const mime = new TextDecoder('iso-8859-1').decode(bytes.subarray(p, p + mimeLen))
      p += mimeLen
      const descLen = readUint32BE(bytes, p)
      p += 4 + descLen
      p += 16 // width, height, depth, colors
      const dataLen = readUint32BE(bytes, p)
      p += 4
      const imageData = bytes.subarray(p, p + dataLen)
      if (imageData.length > 0) {
        result.picture = new Blob([imageData], { type: mime || 'image/jpeg' })
      }
    }

    offset = blockStart + length
  }

  return result
}

function titleFromFilename(filename) {
  const withoutExt = filename.replace(/\.[^/.]+$/, '')
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').trim()
  const trackNumMatch = cleaned.match(/^\d{1,3}[\s.-]+(.*)$/)
  return trackNumMatch ? trackNumMatch[1].trim() : cleaned
}

export async function extractMetadata(file) {
  const base = {
    title: titleFromFilename(file.name),
    artist: 'Artista desconocido',
    album: 'Álbum desconocido',
    genre: '',
    year: '',
    picture: null,
  }

  try {
    const headBuffer = await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer()
    let tags = null
    if (file.type === 'audio/flac' || file.name.toLowerCase().endsWith('.flac')) {
      tags = parseFlac(headBuffer)
    } else {
      tags = parseId3v2(headBuffer)
    }
    if (tags) {
      if (tags.title) base.title = tags.title
      if (tags.artist) base.artist = tags.artist
      if (tags.album) base.album = tags.album
      if (tags.genre) base.genre = tags.genre
      if (tags.year) base.year = tags.year
      if (tags.picture) base.picture = tags.picture
    }
  } catch {
    // Keep filename-derived fallback — a malformed tag block must never
    // block the import of an otherwise playable file.
  }

  return base
}

export function readAudioDuration(objectUrl) {
  return new Promise((resolve) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = objectUrl
    let settled = false
    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve(0)
    }, 8000)
    const cleanup = () => {
      clearTimeout(timeoutId)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('error', onError)
    }
    const onLoaded = () => {
      if (settled) return
      settled = true
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      cleanup()
      resolve(duration)
    }
    const onError = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(0)
    }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('error', onError)
  })
}
