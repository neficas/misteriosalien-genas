import { useState, useRef } from 'react'

export default function AddReminderModal({ onSave, onClose }) {
  const [type, setType] = useState('text')
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState(defaultDatetime())
  const [recording, setRecording] = useState(false)
  const [audioData, setAudioData] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  function defaultDatetime() {
    const d = new Date(Date.now() + 5 * 60 * 1000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => setAudioData(reader.result)
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos.')
    }
  }

  function stopRecording() {
    if (mediaRef.current) mediaRef.current.stop()
    clearInterval(timerRef.current)
    setRecording(false)
  }

  function handleSave() {
    if (!title.trim()) return alert('Escribe un título para el recordatorio.')
    if (!datetime) return alert('Selecciona fecha y hora.')
    if (type === 'voice' && !audioData) return alert('Graba un mensaje de voz.')
    onSave({ type, title: title.trim(), datetime, audioData: audioData || null })
    onClose()
  }

  const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Nuevo recordatorio</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="type-toggle">
          <button
            className={`toggle-btn ${type === 'text' ? 'active' : ''}`}
            onClick={() => setType('text')}
          >
            📝 Texto
          </button>
          <button
            className={`toggle-btn ${type === 'voice' ? 'active' : ''}`}
            onClick={() => setType('voice')}
          >
            🎙️ Voz
          </button>
        </div>

        <div className="form-group">
          <label>Título</label>
          <input
            type="text"
            className="form-input"
            placeholder="¿Qué necesitas recordar?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>Fecha y hora</label>
          <input
            type="datetime-local"
            className="form-input"
            value={datetime}
            onChange={e => setDatetime(e.target.value)}
          />
        </div>

        {type === 'voice' && (
          <div className="form-group">
            <label>Mensaje de voz</label>
            <div className="recorder">
              {!audioData ? (
                <button
                  className={`record-btn ${recording ? 'recording' : ''}`}
                  onClick={recording ? stopRecording : startRecording}
                >
                  {recording ? (
                    <><span className="rec-dot" /> Grabando {fmtTime(recordingTime)} — Detener</>
                  ) : (
                    '⏺ Grabar voz'
                  )}
                </button>
              ) : (
                <div className="audio-preview">
                  <audio controls src={audioData} className="audio-player" />
                  <button
                    className="redo-btn"
                    onClick={() => setAudioData(null)}
                  >
                    Volver a grabar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button className="save-btn" onClick={handleSave}>
          Guardar recordatorio
        </button>
      </div>
    </div>
  )
}
