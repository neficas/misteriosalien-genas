/* global __APP_VERSION__, __BUILD_TIME__ */
import { useEffect, useState } from 'react'
import { useLibrary } from '../hooks/useLibrary'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { estimateStorageUsage } from '../db/database'
import { formatBytes } from '../utils/format'
import { DownloadIcon, TrashIcon, CheckIcon } from './Icons'

export default function SettingsView() {
  const { tracks, playlists, totalSize } = useLibrary()
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const [usage, setUsage] = useState({ usage: 0, quota: 0 })

  useEffect(() => {
    estimateStorageUsage().then(setUsage)
  }, [totalSize])

  const usagePercent = usage.quota ? Math.min(100, (usage.usage / usage.quota) * 100) : 0

  return (
    <div className="view">
      <div className="view-header">
        <h1>Ajustes</h1>
      </div>

      <section className="settings-section">
        <h3>Instalación</h3>
        {installed ? (
          <p className="settings-row">
            <CheckIcon size={18} /> Aural está instalada en este dispositivo
          </p>
        ) : canInstall ? (
          <button className="button-primary" onClick={promptInstall}>
            <DownloadIcon size={18} />
            <span>Instalar en este teléfono</span>
          </button>
        ) : (
          <p className="empty-hint">
            En Chrome para Android, abre el menú ⋮ y elige “Instalar aplicación” o “Añadir a pantalla
            de inicio”.
          </p>
        )}
      </section>

      <section className="settings-section">
        <h3>Almacenamiento</h3>
        <p className="settings-row">
          {tracks.length} canciones · {playlists.length} playlists · {formatBytes(totalSize)} guardados
          en este dispositivo
        </p>
        {usage.quota > 0 && (
          <div className="storage-bar">
            <div className="storage-bar-fill" style={{ width: `${usagePercent}%` }} />
          </div>
        )}
        <p className="empty-hint">
          Todo tu contenido se guarda localmente para reproducción offline. Nada se sube a
          servidores externos.
        </p>
      </section>

      <section className="settings-section">
        <h3>Sobre la calidad HiFi</h3>
        <p className="empty-hint">
          Aural reproduce tus archivos originales sin recompresión (bit-perfect passthrough),
          incluyendo FLAC y WAV sin pérdida. Ajusta el ecualizador de 10 bandas y el crossfade desde
          el reproductor.
        </p>
      </section>

      <section className="settings-section settings-section-danger">
        <h3>Zona de riesgo</h3>
        <ClearLibraryButton />
      </section>

      <p className="version-tag">
        Aural · versión {__APP_VERSION__} · compilada {new Date(__BUILD_TIME__).toLocaleString('es')}
      </p>
    </div>
  )
}

function ClearLibraryButton() {
  const { tracks, removeTrack } = useLibrary()
  const [confirming, setConfirming] = useState(false)

  const handleClear = async () => {
    for (const t of tracks) await removeTrack(t.id)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="inline-create">
        <span>¿Eliminar toda tu biblioteca? Esta acción no se puede deshacer.</span>
        <button className="button-danger" onClick={handleClear}>
          Sí, borrar todo
        </button>
        <button className="button-secondary" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button className="button-danger" onClick={() => setConfirming(true)}>
      <TrashIcon size={18} />
      <span>Borrar toda la biblioteca</span>
    </button>
  )
}
