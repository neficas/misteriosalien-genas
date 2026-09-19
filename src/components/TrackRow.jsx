import Cover from './Cover'
import { PlayIcon, PauseIcon, MoreIcon } from './Icons'
import { formatTime, isLossless } from '../utils/format'

export default function TrackRow({ track, active, playing, onPlay, onMore }) {
  return (
    <div className={`track-row ${active ? 'track-row-active' : ''}`} onClick={onPlay}>
      <div className="track-row-cover">
        <Cover blob={track.cover} size={44} />
        <div className="track-row-play-overlay">
          {active && playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </div>
      </div>
      <div className="track-row-info">
        <p className="track-row-title">{track.title}</p>
        <p className="track-row-subtitle">
          {track.artist}
          {isLossless(track) && <span className="badge-hifi">HIFI</span>}
        </p>
      </div>
      <span className="track-row-duration">{formatTime(track.duration)}</span>
      <button
        className="icon-button"
        onClick={(e) => {
          e.stopPropagation()
          onMore?.(e)
        }}
        aria-label="Más opciones"
      >
        <MoreIcon size={18} />
      </button>
    </div>
  )
}
