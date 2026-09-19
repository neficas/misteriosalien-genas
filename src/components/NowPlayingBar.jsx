import Cover from './Cover'
import { PlayIcon, PauseIcon, NextIcon } from './Icons'
import { usePlayer } from '../hooks/usePlayer'

export default function NowPlayingBar({ onOpen }) {
  const { currentTrack, isPlaying, togglePlay, next, progress } = usePlayer()

  if (!currentTrack) return null

  const percent = progress.duration ? (progress.currentTime / progress.duration) * 100 : 0

  return (
    <div className="now-playing-bar" onClick={onOpen}>
      <div className="now-playing-bar-progress" style={{ width: `${percent}%` }} />
      <Cover blob={currentTrack.cover} size={40} />
      <div className="now-playing-bar-info">
        <p className="now-playing-bar-title">{currentTrack.title}</p>
        <p className="now-playing-bar-artist">{currentTrack.artist}</p>
      </div>
      <button
        className="icon-button"
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
      </button>
      <button
        className="icon-button"
        onClick={(e) => {
          e.stopPropagation()
          next()
        }}
        aria-label="Siguiente"
      >
        <NextIcon size={22} />
      </button>
    </div>
  )
}
