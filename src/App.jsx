import { useState, useEffect } from 'react'
import { useReminders } from './hooks/useReminders'
import { useAlarm } from './hooks/useAlarm'
import { usePush } from './hooks/usePush'
import ReminderCard from './components/ReminderCard'
import AddReminderModal from './components/AddReminderModal'
import AlarmModal from './components/AlarmModal'
import SettingsModal from './components/SettingsModal'
import './styles/index.css'

export default function App() {
  const { reminders, addReminder, deleteReminder, markDone } = useReminders()
  const { activeAlarm, flashing, dismissAlarm } = useAlarm(reminders, markDone)
  const { subscription, backendUrl, saveBackendUrl, sendReminderToBackend, deleteReminderFromBackend } = usePush()
  const [showAdd, setShowAdd] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function handleAddReminder(reminder) {
    addReminder(reminder)
    sendReminderToBackend({ ...reminder, id: Date.now() })
  }

  function handleDelete(id) {
    deleteReminder(id)
    deleteReminderFromBackend(id)
  }

  const sorted = [...reminders].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const filtered = sorted.filter(r =>
    filter === 'all' ? true : filter === 'pending' ? !r.done : r.done
  )

  const pushActive = !!backendUrl && !!subscription

  return (
    <div className="app">
      <AlarmModal alarm={activeAlarm} flashing={flashing} onDismiss={dismissAlarm} />

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-u">U</span>
            <span className="logo-text">rantia</span>
          </div>
          <div className="header-right">
            {pushActive && <span className="push-badge">🔔</span>}
            <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Ajustes">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        {['pending', 'done', 'all'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' ? 'Pendientes' : f === 'done' ? 'Completados' : 'Todos'}
          </button>
        ))}
      </div>

      <main className="main">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔔</div>
            <p>No hay recordatorios</p>
            <span>Toca + para agregar uno</span>
          </div>
        ) : (
          <div className="reminder-list">
            {filtered.map(r => (
              <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Agregar recordatorio">
        +
      </button>

      {showAdd && (
        <AddReminderModal
          onSave={reminder => { addReminder(reminder); sendReminderToBackend(reminder) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUrl={backendUrl}
          onSave={saveBackendUrl}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
