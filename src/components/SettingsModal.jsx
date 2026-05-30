import { useState } from 'react'

export default function SettingsModal({ currentUrl, onSave, onClose }) {
  const [url, setUrl] = useState(currentUrl || '')
  const [status, setStatus] = useState('')
  const [testing, setTesting] = useState(false)

  async function handleSave() {
    const trimmed = url.trim().replace(/\/$/, '')
    if (!trimmed) {
      onSave('')
      setStatus('Servidor desconectado.')
      return
    }
    setTesting(true)
    setStatus('')
    try {
      const res = await fetch(`${trimmed}/ping`, { signal: AbortSignal.timeout(5000) })
      const text = await res.text()
      if (text === 'OK') {
        onSave(trimmed)
        setStatus('✓ Conectado. Notificaciones push activadas.')
      } else {
        setStatus('Error: respuesta inesperada del servidor.')
      }
    } catch {
      setStatus('Error: no se pudo conectar. Verifica la URL.')
    }
    setTesting(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Ajustes</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-info">
          <p>Para recibir alarmas aunque el teléfono esté bloqueado, conecta tu servidor Urantia.</p>
        </div>

        <div className="form-group">
          <label>URL del servidor</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://urantia-server.onrender.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        {status && (
          <p className={`settings-status ${status.startsWith('✓') ? 'status-ok' : 'status-err'}`}>
            {status}
          </p>
        )}

        <button className="save-btn" onClick={handleSave} disabled={testing}>
          {testing ? 'Verificando…' : 'Guardar'}
        </button>

        <div className="settings-guide">
          <p>¿Cómo obtener el servidor?</p>
          <ol>
            <li>Ve a <strong>render.com</strong> e inicia sesión con GitHub</li>
            <li>Crea un <strong>Web Service</strong> desde el repo <code>misteriosalien-genas</code></li>
            <li>En Root Directory escribe: <code>server</code></li>
            <li>Copia la URL que te da Render y pégala aquí</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
