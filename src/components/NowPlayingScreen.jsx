import { useState } from 'react'
import Cover from './Cover'
import EqualizerPanel from './EqualizerPanel'
import {
  ChevronDownIcon,
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  EqualizerIcon,
} from './Icons'
import { usePlayer } from '../hooks/usePlayer'
import { formatTime, qualityLabel } from '../utils/format'

export default function NowPlayingScreen({ onClose }) {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    prev,
    progress,
    seek,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    volume,
    setVolume,
  } = usePlayer()
  const [eqOpen, setEqOpen] = useState(false)
  const [seeking, setSeeking] = useState(null)

  if (!currentTrack) return null

  const displayTime = seeking ?? progress.currentTime
  const cycleRepeat = () => {
    setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')
  }

  return (
    <div className="now-playing-screen">
      <header className="now-playing-header">
        <button className="icon-button" onClick={onClose} aria-label="Cerrar">
          <ChevronDownIcon size={26} />
        </button>
        <span className="now-playing-header-label">Reproduciendo ahora</span>
        <button className="icon-button" onClick={() => setEqOpen(true)} aria-label="Ecualizador">
          <EqualizerIcon size={22} />
        </button>
      </header>

      <div className="now-playing-cover-wrap">
        <Cover blob={currentTrack.cover} size={null} className="now-playing-cover" />
      </div>

      <div className="now-playing-meta">
        <h2>{currentTrack.title}</h2>
        <p>{currentTrack.artist}</p>
        <span className="badge-quality">{qualityLabel(currentTrack)}</span>
      </div>

      <div className="now-playing-seek">
        <input
          type="range"
          min={0}
          max={progress.duration || 0}
          step={0.1}
          value={displayTime}
          onChange={(e) => setSeeking(Number(e.target.value))}
          onMouseUp={() => {
            if (seeking != null) seek(seeking)
            setSeeking(null)
          }}
          onTouchEnd={() => {
            if (seeking != null) seek(seeking)
            setSeeking(null)
          }}
        />
        <div className="now-playing-times">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(progress.duration)}</span>
        </div>
      </div>

      <div className="now-playing-controls">
        <button
          className={`icon-button ${shuffle ? 'icon-button-active' : ''}`}
          onClick={() => setShuffle(!shuffle)}
          aria-label="Aleatorio"
        >
          <ShuffleIcon size={20} />
        </button>
        <button className="icon-button" onClick={prev} aria-label="Anterior">
          <PrevIcon size={30} />
        </button>
        <button className="play-button-large" onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
          {isPlaying ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <button className="icon-button" onClick={next} aria-label="Siguiente">
          <NextIcon size={30} />
        </button>
        <button
          className={`icon-button ${repeat !== 'off' ? 'icon-button-active' : ''}`}
          onClick={cycleRepeat}
          aria-label="Repetir"
        >
          {repeat === 'one' ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
        </button>
      </div>

      <div className="now-playing-volume">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      <EqualizerPanel open={eqOpen} onClose={() => setEqOpen(false)} />
    </div>
  )
}
