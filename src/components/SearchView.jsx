import { useMemo, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { usePlayer } from '../hooks/usePlayer'
import TrackRow from './TrackRow'
import TrackMenu from './TrackMenu'
import { SearchIcon } from './Icons'

export default function SearchView() {
  const { tracks } = useLibrary()
  const { currentTrack, isPlaying, playQueue } = usePlayer()
  const [query, setQuery] = useState('')
  const [menuTrack, setMenuTrack] = useState(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q),
    )
  }, [tracks, query])

  return (
    <div className="view">
      <div className="search-input-wrap">
        <SearchIcon size={18} />
        <input
          autoFocus
          placeholder="Buscar canciones, artistas o álbumes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {query.trim() && results.length === 0 && <p className="empty-hint">Sin resultados para “{query}”.</p>}

      <div className="track-list">
        {results.map((t, i) => (
          <TrackRow
            key={t.id}
            track={t}
            active={currentTrack?.id === t.id}
            playing={isPlaying}
            onPlay={() => playQueue(results, i)}
            onMore={() => setMenuTrack(t)}
          />
        ))}
      </div>

      <TrackMenu track={menuTrack} open={!!menuTrack} onClose={() => setMenuTrack(null)} />
    </div>
  )
}
