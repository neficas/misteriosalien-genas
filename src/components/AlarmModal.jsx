import { useEffect, useState } from 'react'

export default function AlarmModal({ alarm, flashing, onDismiss }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setVisible(v => !v), 500)
    return () => clearInterval(id)
  }, [])

  if (!alarm) return null

  const dt = new Date(alarm.datetime)
  const timeStr = dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="alarm-overlay"
      style={{ background: flashing && visible ? '#2563EB' : '#1E40AF' }}
    >
      <div className="alarm-content">
        <div className="alarm-icon">{alarm.type === 'voice' ? '🎙️' : '📝'}</div>
        <div className="alarm-time">{timeStr}</div>
        <h2 className="alarm-title">{alarm.title}</h2>
        {alarm.type === 'voice' && alarm.audioData && (
          <audio
            autoPlay
            controls
            src={alarm.audioData}
            className="alarm-audio"
          />
        )}
        <button className="alarm-dismiss" onClick={onDismiss}>
          Detener
        </button>
      </div>
    </div>
  )
}
