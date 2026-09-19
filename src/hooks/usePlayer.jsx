import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AudioEngine, EQ_BANDS, EQ_PRESETS } from '../audio/AudioEngine'
import * as db from '../db/database'

const PlayerContext = createContext(null)

function shuffleOrder(length) {
  const order = Array.from({ length }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function PlayerProvider({ children }) {
  const [engine] = useState(() => new AudioEngine())

  const [queue, setQueue] = useState([])
  const [order, setOrder] = useState([])
  const [position, setPosition] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 })
  const [shuffle, setShuffleState] = useState(false)
  const [repeat, setRepeat] = useState('off')
  const [volume, setVolumeState] = useState(1)
  const [eqBands, setEqBandsState] = useState(() => [...EQ_PRESETS.Plano])
  const [eqPreset, setEqPresetState] = useState('Plano')
  const [crossfade, setCrossfadeState] = useState(0)
  const [currentUrl, setCurrentUrl] = useState(null)

  const currentUrlRef = useRef(null)
  const nextUrlRef = useRef(null)
  const skipNextLoadRef = useRef(false)

  const currentIndex = order[position]
  const currentTrack = currentIndex !== undefined ? queue[currentIndex] : null

  // Restore persisted settings once.
  useEffect(() => {
    (async () => {
      const savedVolume = await db.getSetting('volume', 1)
      const savedEq = await db.getSetting('eqBands', [...EQ_PRESETS.Plano])
      const savedCrossfade = await db.getSetting('crossfade', 0)
      const savedRepeat = await db.getSetting('repeat', 'off')
      const savedShuffle = await db.getSetting('shuffle', false)
      setVolumeState(savedVolume)
      setEqBandsState(savedEq)
      setCrossfadeState(savedCrossfade)
      setRepeat(savedRepeat)
      setShuffleState(savedShuffle)
      engine.setVolume(savedVolume)
      savedEq.forEach((v, i) => engine.setEQBand(i, v))
      engine.setCrossfadeSeconds(savedCrossfade)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advance = useCallback(
    (direction) => {
      setPosition((pos) => {
        if (order.length === 0) return pos
        let next = pos + direction
        if (next < 0) next = repeat === 'all' ? order.length - 1 : 0
        if (next >= order.length) {
          if (repeat === 'all') next = 0
          else return pos
        }
        return next
      })
    },
    [order.length, repeat],
  )

  const computeNextPosition = useCallback(() => {
    if (order.length === 0) return null
    if (repeat === 'one') return position
    let next = position + 1
    if (next >= order.length) {
      if (repeat === 'all') next = 0
      else return null
    }
    return next
  }, [order.length, position, repeat])

  const loadUrlForTrack = useCallback((track) => {
    if (!track) return null
    return URL.createObjectURL(track.blob)
  }, [])

  // Load & play whenever the active track changes.
  useEffect(() => {
    if (!currentTrack) return
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    let cancelled = false
    ;(async () => {
      const url = loadUrlForTrack(currentTrack)
      if (cancelled) {
        URL.revokeObjectURL(url)
        return
      }
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = url
      setCurrentUrl(url)
      await engine.loadAndPlay(url)
      setIsPlaying(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  // Preload the next track's object URL for crossfade.
  useEffect(() => {
    const nextPos = computeNextPosition()
    const nextTrack = nextPos !== null ? queue[order[nextPos]] : null
    if (nextUrlRef.current) {
      URL.revokeObjectURL(nextUrlRef.current)
      nextUrlRef.current = null
    }
    if (nextTrack && crossfade > 0) {
      const url = URL.createObjectURL(nextTrack.blob)
      nextUrlRef.current = url
      engine.prepareNext(url)
    } else {
      engine.prepareNext(null)
    }
  }, [computeNextPosition, queue, order, crossfade, engine])

  // Engine event wiring.
  useEffect(() => {
    const offTime = engine.on('timeupdate', (p) => setProgress(p))
    const offPlay = engine.on('play', () => setIsPlaying(true))
    const offPause = engine.on('pause', () => setIsPlaying(false))
    const offLoaded = engine.on('loadedmetadata', (duration) =>
      setProgress((p) => ({ ...p, duration })),
    )
    const offEnded = engine.on('ended', () => {
      if (repeat === 'one') {
        engine.seek(0)
        engine.play()
        return
      }
      const nextPos = computeNextPosition()
      if (nextPos === null) {
        setIsPlaying(false)
        return
      }
      setPosition(nextPos)
    })
    const offCrossfaded = engine.on('crossfaded', ({ duration }) => {
      const nextPos = computeNextPosition()
      if (nextPos === null) return
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = nextUrlRef.current
      nextUrlRef.current = null
      setCurrentUrl(currentUrlRef.current)
      setProgress({ currentTime: 0, duration })
      skipNextLoadRef.current = true
      setPosition(nextPos)
    })
    return () => {
      offTime()
      offPlay()
      offPause()
      offLoaded()
      offEnded()
      offCrossfaded()
    }
  }, [engine, computeNextPosition, repeat])

  const playQueue = useCallback(
    (tracks, startIndex = 0, shuffleNow = shuffle) => {
      setQueue(tracks)
      if (shuffleNow) {
        const newOrder = shuffleOrder(tracks.length)
        const idx = newOrder.indexOf(startIndex)
        if (idx > 0) {
          ;[newOrder[0], newOrder[idx]] = [newOrder[idx], newOrder[0]]
        }
        setOrder(newOrder)
        setPosition(0)
      } else {
        setOrder(tracks.map((_, i) => i))
        setPosition(startIndex)
      }
    },
    [shuffle],
  )

  const togglePlay = useCallback(() => {
    if (!currentTrack) return
    if (isPlaying) engine.pause()
    else engine.play()
  }, [currentTrack, isPlaying, engine])

  const next = useCallback(() => advance(1), [advance])
  const prev = useCallback(() => {
    if (progress.currentTime > 3) {
      engine.seek(0)
      return
    }
    advance(-1)
  }, [advance, progress.currentTime, engine])

  const seek = useCallback((time) => engine.seek(time), [engine])

  const setVolume = useCallback(
    (v) => {
      setVolumeState(v)
      engine.setVolume(v)
      db.setSetting('volume', v)
    },
    [engine],
  )

  const setShuffle = useCallback(
    (value) => {
      setShuffleState(value)
      db.setSetting('shuffle', value)
      if (queue.length === 0) return
      const currentTrackId = currentTrack?.id
      const idx = currentTrackId ? queue.findIndex((t) => t.id === currentTrackId) : -1

      if (!value) {
        setOrder(queue.map((_, i) => i))
        if (idx >= 0) setPosition(idx)
        return
      }

      const newOrder = shuffleOrder(queue.length)
      if (idx >= 0) {
        const orderIdx = newOrder.indexOf(idx)
        if (orderIdx > 0) {
          ;[newOrder[0], newOrder[orderIdx]] = [newOrder[orderIdx], newOrder[0]]
        }
        setOrder(newOrder)
        setPosition(0)
      } else {
        setOrder(newOrder)
      }
    },
    [queue, currentTrack],
  )

  const setRepeatMode = useCallback((mode) => {
    setRepeat(mode)
    db.setSetting('repeat', mode)
  }, [])

  const setEQBand = useCallback(
    (index, dB) => {
      setEqBandsState((prev) => {
        const next = [...prev]
        next[index] = dB
        db.setSetting('eqBands', next)
        return next
      })
      engine.setEQBand(index, dB)
      setEqPresetState('Personalizado')
    },
    [engine],
  )

  const applyEQPreset = useCallback(
    (name) => {
      const values = EQ_PRESETS[name]
      if (!values) return
      setEqBandsState(values)
      setEqPresetState(name)
      engine.setEQPreset(values)
      db.setSetting('eqBands', values)
    },
    [engine],
  )

  const setCrossfade = useCallback(
    (seconds) => {
      setCrossfadeState(seconds)
      engine.setCrossfadeSeconds(seconds)
      db.setSetting('crossfade', seconds)
    },
    [engine],
  )

  // Media Session API — lock screen / notification controls on Android.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!currentTrack) return
    const artwork = currentTrack.cover
      ? [{ src: URL.createObjectURL(currentTrack.cover), sizes: '512x512', type: currentTrack.cover.type }]
      : []
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork,
    })
    navigator.mediaSession.setActionHandler('play', () => engine.play())
    navigator.mediaSession.setActionHandler('pause', () => engine.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) engine.seek(details.seekTime)
    })
    return () => {
      artwork.forEach((a) => URL.revokeObjectURL(a.src))
    }
  }, [currentTrack, engine, next, prev])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current)
      if (nextUrlRef.current) URL.revokeObjectURL(nextUrlRef.current)
      engine.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({
      queue,
      currentTrack,
      currentUrl,
      isPlaying,
      progress,
      shuffle,
      repeat,
      volume,
      eqBands,
      eqPreset,
      eqBandFrequencies: EQ_BANDS,
      eqPresetNames: Object.keys(EQ_PRESETS),
      crossfade,
      playQueue,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      setShuffle,
      setRepeat: setRepeatMode,
      setEQBand,
      applyEQPreset,
      setCrossfade,
    }),
    [
      queue,
      currentTrack,
      currentUrl,
      isPlaying,
      progress,
      shuffle,
      repeat,
      volume,
      eqBands,
      eqPreset,
      crossfade,
      playQueue,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      setShuffle,
      setRepeatMode,
      setEQBand,
      applyEQPreset,
      setCrossfade,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook lives alongside its provider
export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer debe usarse dentro de PlayerProvider')
  return ctx
}
