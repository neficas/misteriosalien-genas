import { useMemo, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { usePlayer } from '../hooks/usePlayer'
import TrackRow from './TrackRow'
import TrackMenu from './TrackMenu'
import ImportButton from './ImportButton'
import Cover from './Cover'
import { formatBytes } from '../utils/format'

const SECTIONS = ['Canciones', 'Álbumes', 'Artistas']

export default function LibraryView() {
  const { tracks, albums, artists, loading, importState, totalSize } = useLibrary()
  const { currentTrack, isPlaying, playQueue } = usePlayer()
  const [section, setSection] = useState('Canciones')
  const [menuTrack, setMenuTrack] = useState(null)
  const [openAlbum, setOpenAlbum] = useState(null)

  const sortedTracks = useMemo(() => tracks, [tracks])

  const handlePlayTrack = (list, index) => playQueue(list, index)

  if (loading) {
    return <div className="view-loading">Cargando biblioteca…</div>
  }

  if (tracks.length === 0) {
    return (
      <div className="empty-state">
        <Cover blob={null} size={96} />
        <h2>Tu biblioteca está vacía</h2>
        <p>Importa tus canciones (MP3, FLAC, WAV, OGG, M4A) para escucharlas offline en HiFi.</p>
        <ImportButton label="Importar música" />
      </div>
    )
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Biblioteca</h1>
          <p className="view-subtitle">
            {tracks.length} canciones · {formatBytes(totalSize)}
          </p>
        </div>
        <ImportButton compact />
      </div>

      {importState.active && (
        <div className="import-banner">
          Importando {importState.done}/{importState.total} — {importState.currentName}
        </div>
      )}

      <div className="segmented">
        {SECTIONS.map((s) => (
          <button
            key={s}
            className={`segmented-item ${section === s ? 'segmented-item-active' : ''}`}
            onClick={() => {
              setSection(s)
              setOpenAlbum(null)
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'Canciones' && (
        <div className="track-list">
          {sortedTracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              active={currentTrack?.id === t.id}
              playing={isPlaying}
              onPlay={() => handlePlayTrack(sortedTracks, i)}
              onMore={() => setMenuTrack(t)}
            />
          ))}
        </div>
      )}

      {section === 'Álbumes' && !openAlbum && (
        <div className="grid">
          {albums.map((a) => (
            <button key={`${a.album}::${a.artist}`} className="grid-card" onClick={() => setOpenAlbum(a)}>
              <Cover blob={a.cover} size={null} className="grid-cover" />
              <p className="grid-card-title">{a.album}</p>
              <p className="grid-card-subtitle">{a.artist}</p>
            </button>
          ))}
        </div>
      )}

      {section === 'Álbumes' && openAlbum && (
        <div>
          <button className="back-link" onClick={() => setOpenAlbum(null)}>
            ← Álbumes
          </button>
          <div className="album-header">
            <Cover blob={openAlbum.cover} size={120} />
            <div>
              <h2>{openAlbum.album}</h2>
              <p>{openAlbum.artist}</p>
            </div>
          </div>
          <div className="track-list">
            {openAlbum.tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                active={currentTrack?.id === t.id}
                playing={isPlaying}
                onPlay={() => handlePlayTrack(openAlbum.tracks, i)}
                onMore={() => setMenuTrack(t)}
              />
            ))}
          </div>
        </div>
      )}

      {section === 'Artistas' && !openAlbum && (
        <div className="simple-list">
          {artists.map((a) => (
            <button key={a.artist} className="simple-list-item" onClick={() => setOpenAlbum({ album: a.artist, artist: `${a.tracks.length} canciones`, tracks: a.tracks, cover: a.tracks[0]?.cover })}>
              <Cover blob={a.tracks[0]?.cover} size={44} />
              <div>
                <p className="track-row-title">{a.artist}</p>
                <p className="track-row-subtitle">{a.tracks.length} canciones</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {section === 'Artistas' && openAlbum && (
        <div>
          <button className="back-link" onClick={() => setOpenAlbum(null)}>
            ← Artistas
          </button>
          <div className="album-header">
            <Cover blob={openAlbum.cover} size={120} />
            <div>
              <h2>{openAlbum.album}</h2>
              <p>{openAlbum.artist}</p>
            </div>
          </div>
          <div className="track-list">
            {openAlbum.tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                active={currentTrack?.id === t.id}
                playing={isPlaying}
                onPlay={() => handlePlayTrack(openAlbum.tracks, i)}
                onMore={() => setMenuTrack(t)}
              />
            ))}
          </div>
        </div>
      )}

      <TrackMenu track={menuTrack} open={!!menuTrack} onClose={() => setMenuTrack(null)} />
    </div>
  )
}
