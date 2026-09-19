import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as db from '../db/database'
import { extractMetadata, readAudioDuration } from '../utils/metadata'
import { uid } from '../utils/format'

const LibraryContext = createContext(null)

const AUDIO_EXTENSIONS = /\.(mp3|flac|wav|ogg|oga|opus|m4a|aac|weba)$/i

export function LibraryProvider({ children }) {
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [importState, setImportState] = useState({ active: false, done: 0, total: 0, currentName: '' })

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([db.getAllTracks(), db.getAllPlaylists()])
      setTracks(t.reverse())
      setPlaylists(p)
      setLoading(false)
    })()
  }, [])

  const importFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter((f) => AUDIO_EXTENSIONS.test(f.name) || f.type.startsWith('audio/'))
    if (files.length === 0) return

    setImportState({ active: true, done: 0, total: files.length, currentName: '' })
    const added = []
    const batchStart = Date.now()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setImportState((s) => ({ ...s, currentName: file.name }))
      try {
        const meta = await extractMetadata(file)
        const objectUrl = URL.createObjectURL(file)
        const duration = await readAudioDuration(objectUrl)
        URL.revokeObjectURL(objectUrl)

        const track = {
          id: uid(),
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          genre: meta.genre,
          year: meta.year,
          duration,
          size: file.size,
          mimeType: file.type || 'audio/mpeg',
          extension: file.name.split('.').pop().toLowerCase(),
          blob: file,
          cover: meta.picture || null,
          addedAt: batchStart - i,
        }
        await db.addTrack(track)
        added.push(track)
      } catch (err) {
        console.error('No se pudo importar', file.name, err)
      }
      setImportState((s) => ({ ...s, done: s.done + 1 }))
    }

    setTracks((prev) => [...added, ...prev])
    setImportState({ active: false, done: 0, total: 0, currentName: '' })
  }, [])

  const removeTrack = useCallback(async (id) => {
    await db.deleteTrack(id)
    setTracks((prev) => prev.filter((t) => t.id !== id))
    setPlaylists((prev) => {
      const updated = prev.map((p) => ({ ...p, trackIds: p.trackIds.filter((tid) => tid !== id) }))
      updated.forEach((p) => db.savePlaylist(p))
      return updated
    })
  }, [])

  const updateTrackMeta = useCallback(async (id, patch) => {
    setTracks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      const updated = next.find((t) => t.id === id)
      if (updated) db.updateTrack(updated)
      return next
    })
  }, [])

  const createPlaylist = useCallback(async (name) => {
    const playlist = { id: uid(), name, trackIds: [], createdAt: Date.now() }
    await db.savePlaylist(playlist)
    setPlaylists((prev) => [playlist, ...prev])
    return playlist
  }, [])

  const deletePlaylistById = useCallback(async (id) => {
    await db.deletePlaylist(id)
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const renamePlaylist = useCallback(async (id, name) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name } : p))
      const updated = next.find((p) => p.id === id)
      if (updated) db.savePlaylist(updated)
      return next
    })
  }, [])

  const addToPlaylist = useCallback(async (playlistId, trackId) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== playlistId) return p
        if (p.trackIds.includes(trackId)) return p
        const updated = { ...p, trackIds: [...p.trackIds, trackId] }
        db.savePlaylist(updated)
        return updated
      })
      return next
    })
  }, [])

  const removeFromPlaylist = useCallback(async (playlistId, trackId) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== playlistId) return p
        const updated = { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) }
        db.savePlaylist(updated)
        return updated
      })
      return next
    })
  }, [])

  const reorderPlaylist = useCallback(async (playlistId, trackIds) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== playlistId) return p
        const updated = { ...p, trackIds }
        db.savePlaylist(updated)
        return updated
      })
      return next
    })
  }, [])

  const albums = useMemo(() => {
    const map = new Map()
    for (const t of tracks) {
      const key = `${t.album}::${t.artist}`
      if (!map.has(key)) map.set(key, { album: t.album, artist: t.artist, cover: t.cover, tracks: [] })
      map.get(key).tracks.push(t)
    }
    return [...map.values()].sort((a, b) => a.album.localeCompare(b.album))
  }, [tracks])

  const artists = useMemo(() => {
    const map = new Map()
    for (const t of tracks) {
      if (!map.has(t.artist)) map.set(t.artist, { artist: t.artist, tracks: [] })
      map.get(t.artist).tracks.push(t)
    }
    return [...map.values()].sort((a, b) => a.artist.localeCompare(b.artist))
  }, [tracks])

  const totalSize = useMemo(() => tracks.reduce((acc, t) => acc + (t.size || 0), 0), [tracks])

  const value = {
    tracks,
    playlists,
    albums,
    artists,
    loading,
    importState,
    totalSize,
    importFiles,
    removeTrack,
    updateTrackMeta,
    createPlaylist,
    deletePlaylist: deletePlaylistById,
    renamePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
  }

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook lives alongside its provider
export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary debe usarse dentro de LibraryProvider')
  return ctx
}
