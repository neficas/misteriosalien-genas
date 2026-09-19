import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as db from '../db/database'
import { extractMetadata, readAudioDuration } from '../utils/metadata'
import { uid } from '../utils/format'
import { consumeSharedFiles } from '../utils/shareTarget'

const LibraryContext = createContext(null)

const AUDIO_EXTENSIONS = /\.(mp3|flac|wav|ogg|oga|opus|m4a|aac|weba)$/i

export function LibraryProvider({ children }) {
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [importState, setImportState] = useState({ active: false, done: 0, total: 0, currentName: '' })
  const [importError, setImportError] = useState('')

  useEffect(() => {
    (async () => {
      const [t, p] = await Promise.all([db.getAllTracks(), db.getAllPlaylists()])
      setTracks(t.reverse())
      setPlaylists(p)
      setLoading(false)
    })()
  }, [])

  const importFiles = useCallback(async (fileList) => {
    setImportError('')
    const allFiles = Array.from(fileList)
    const files = allFiles.filter((f) => AUDIO_EXTENSIONS.test(f.name) || f.type.startsWith('audio/'))
    if (files.length === 0) {
      if (allFiles.length > 0) {
        setImportError('Ninguno de los archivos seleccionados parece ser de audio.')
      }
      return
    }

    setImportState({ active: true, done: 0, total: files.length, currentName: '' })
    const added = []
    const failed = []
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
        failed.push(file.name)
      }
      setImportState((s) => ({ ...s, done: s.done + 1 }))
    }

    setTracks((prev) => [...added, ...prev])
    setImportState({ active: false, done: 0, total: 0, currentName: '' })

    if (failed.length > 0 && added.length === 0) {
      setImportError(
        files.length === 1
          ? `No se pudo importar "${failed[0]}". Puede que el formato no sea compatible.`
          : `No se pudo importar ninguno de los ${failed.length} archivos seleccionados.`,
      )
    } else if (failed.length > 0) {
      setImportError(`${failed.length} de ${files.length} archivos no se pudieron importar.`)
    }
  }, [])

  // Files pushed in from Android's native Share sheet (see src/sw.js) —
  // the reliable import path on devices with no file-manager app
  // registered for the in-app file picker.
  useEffect(() => {
    (async () => {
      const files = await consumeSharedFiles()
      if (files.length > 0) importFiles(files)
    })()
  }, [importFiles])

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
    importError,
    clearImportError: () => setImportError(''),
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
