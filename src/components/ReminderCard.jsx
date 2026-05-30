import { useState } from 'react'

export default function ReminderCard({ reminder, onDelete }) {
  const [playing, setPlaying] = useState(false)

  const dt = new Date(reminder.datetime)
  const dateStr = dt.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const isPast = dt < new Date() || reminder.done

  function handlePlay(e) {
    e.stopPropagation()
    setPlaying(true)
    const audio = new Audio(reminder.audioData)
    audio.play()
    audio.onended = () => setPlaying(false)
  }

  return (
    <div className={`reminder-card ${isPast ? 'reminder-done' : ''}`}>
      <div className="reminder-type-icon">
        {reminder.type === 'voice' ? '🎙️' : '📝'}
      </div>
      <div className="reminder-info">
        <p className="reminder-title">{reminder.title}</p>
        <p className="reminder-datetime">{dateStr} — {timeStr}</p>
        {reminder.type === 'voice' && reminder.audioData && (
          <button
            className="play-btn"
            onClick={handlePlay}
            disabled={playing}
          >
            {playing ? '▶ Reproduciendo…' : '▶ Escuchar'}
          </button>
        )}
      </div>
      <div className="reminder-actions">
        {isPast && <span className="badge-done">✓</span>}
        {!isPast && reminder.scheduled && <span title="Alarma programada">🔔</span>}
        <button
          className="delete-btn"
          onClick={() => onDelete(reminder.id)}
          aria-label="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
