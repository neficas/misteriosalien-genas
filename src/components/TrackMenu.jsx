import { useState } from 'react'
import Sheet from './Sheet'
import { useLibrary } from '../hooks/useLibrary'
import { PlaylistIcon, TrashIcon, PlusIcon, CheckIcon } from './Icons'

export default function TrackMenu({ track, open, onClose, playlistContext, onRemoveFromPlaylist }) {
  const { playlists, addToPlaylist, createPlaylist, removeTrack } = useLibrary()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  if (!open || !track) return null

  const handleAdd = async (playlistId) => {
    await addToPlaylist(playlistId, track.id)
    onClose()
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const playlist = await createPlaylist(name)
    await addToPlaylist(playlist.id, track.id)
    setNewName('')
    setCreating(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={track.title}>
      <div className="track-menu">
        {playlistContext && (
          <button
            className="track-menu-item"
            onClick={() => {
              onRemoveFromPlaylist?.(track.id)
              onClose()
            }}
          >
            <TrashIcon size={18} />
            <span>Quitar de esta playlist</span>
          </button>
        )}

        <p className="track-menu-label">Añadir a playlist</p>
        <div className="track-menu-playlists">
          {playlists.map((p) => (
            <button key={p.id} className="track-menu-item" onClick={() => handleAdd(p.id)}>
              <PlaylistIcon size={18} />
              <span>{p.name}</span>
              {p.trackIds.includes(track.id) && <CheckIcon size={16} />}
            </button>
          ))}
          {playlists.length === 0 && !creating && (
            <p className="empty-hint">Aún no tienes playlists.</p>
          )}
        </div>

        {creating ? (
          <div className="track-menu-create">
            <input
              autoFocus
              placeholder="Nombre de la playlist"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button className="button-primary" onClick={handleCreate}>
              Crear
            </button>
          </div>
        ) : (
          <button className="track-menu-item" onClick={() => setCreating(true)}>
            <PlusIcon size={18} />
            <span>Nueva playlist</span>
          </button>
        )}

        <div className="sheet-divider" />

        <button
          className="track-menu-item track-menu-danger"
          onClick={() => {
            removeTrack(track.id)
            onClose()
          }}
        >
          <TrashIcon size={18} />
          <span>Eliminar de mi biblioteca</span>
        </button>
      </div>
    </Sheet>
  )
}
