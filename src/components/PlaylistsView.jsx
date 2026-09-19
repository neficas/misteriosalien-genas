import { useMemo, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { usePlayer } from '../hooks/usePlayer'
import TrackRow from './TrackRow'
import TrackMenu from './TrackMenu'
import Cover from './Cover'
import { PlusIcon, TrashIcon, PlaylistIcon } from './Icons'

export default function PlaylistsView() {
  const { playlists, tracks, createPlaylist, deletePlaylist, removeFromPlaylist } = useLibrary()
  const { currentTrack, isPlaying, playQueue } = usePlayer()
  const [openId, setOpenId] = useState(null)
  const [menuTrack, setMenuTrack] = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const tracksById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const openPlaylist = playlists.find((p) => p.id === openId)
  const openTracks = useMemo(
    () => (openPlaylist ? openPlaylist.trackIds.map((id) => tracksById.get(id)).filter(Boolean) : []),
    [openPlaylist, tracksById],
  )

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const p = await createPlaylist(trimmed)
    setName('')
    setCreating(false)
    setOpenId(p.id)
  }

  if (openPlaylist) {
    return (
      <div className="view">
        <button className="back-link" onClick={() => setOpenId(null)}>
          ← Playlists
        </button>
        <div className="album-header">
          <Cover blob={openTracks[0]?.cover} size={120} />
          <div>
            <h2>{openPlaylist.name}</h2>
            <p>{openTracks.length} canciones</p>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              deletePlaylist(openPlaylist.id)
              setOpenId(null)
            }}
            aria-label="Eliminar playlist"
          >
            <TrashIcon size={20} />
          </button>
        </div>

        {openTracks.length === 0 ? (
          <p className="empty-hint">
            Añade canciones desde el menú “···” de cualquier pista en Biblioteca.
          </p>
        ) : (
          <div className="track-list">
            {openTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                active={currentTrack?.id === t.id}
                playing={isPlaying}
                onPlay={() => playQueue(openTracks, i)}
                onMore={() => setMenuTrack(t)}
              />
            ))}
          </div>
        )}

        <TrackMenu
          track={menuTrack}
          open={!!menuTrack}
          onClose={() => setMenuTrack(null)}
          playlistContext={openPlaylist.id}
          onRemoveFromPlaylist={(trackId) => removeFromPlaylist(openPlaylist.id, trackId)}
        />
      </div>
    )
  }

  return (
    <div className="view">
      <div className="view-header">
        <h1>Playlists</h1>
        <button className="icon-button" onClick={() => setCreating(true)} aria-label="Nueva playlist">
          <PlusIcon size={22} />
        </button>
      </div>

      {creating && (
        <div className="inline-create">
          <input
            autoFocus
            placeholder="Nombre de la playlist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button className="button-primary" onClick={handleCreate}>
            Crear
          </button>
        </div>
      )}

      {playlists.length === 0 && !creating ? (
        <div className="empty-state">
          <PlaylistIcon size={64} />
          <h2>Sin playlists todavía</h2>
          <p>Crea una para organizar tu música.</p>
        </div>
      ) : (
        <div className="simple-list">
          {playlists.map((p) => (
            <button key={p.id} className="simple-list-item" onClick={() => setOpenId(p.id)}>
              <Cover blob={tracksById.get(p.trackIds[0])?.cover} size={44} />
              <div>
                <p className="track-row-title">{p.name}</p>
                <p className="track-row-subtitle">{p.trackIds.length} canciones</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
