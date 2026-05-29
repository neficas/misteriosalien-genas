import { useState, useCallback } from 'react'
import { loadReminders, saveReminders } from '../utils/storage'

export function useReminders() {
  const [reminders, setReminders] = useState(() => loadReminders())

  const addReminder = useCallback((reminder) => {
    setReminders(prev => {
      const updated = [...prev, { ...reminder, id: Date.now(), done: false }]
      saveReminders(updated)
      return updated
    })
  }, [])

  const deleteReminder = useCallback((id) => {
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id)
      saveReminders(updated)
      return updated
    })
  }, [])

  const markDone = useCallback((id) => {
    setReminders(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, done: true } : r)
      saveReminders(updated)
      return updated
    })
  }, [])

  return { reminders, addReminder, deleteReminder, markDone }
}
