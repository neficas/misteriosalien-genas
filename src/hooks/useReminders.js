import { useState, useCallback } from 'react'
import { loadReminders, saveReminders } from '../utils/storage'

async function scheduleNativeNotification(reminder) {
  if (!('serviceWorker' in navigator)) return false
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false
    const reg = await navigator.serviceWorker.ready
    const target = new Date(reminder.datetime).getTime()
    if (target <= Date.now()) return false

    await reg.showNotification(`Urantia — ${reminder.title}`, {
      body: reminder.type === 'voice'
        ? `🎙️ Recordatorio de voz: ${reminder.title}`
        : `📝 ${reminder.title}`,
      showTrigger: new TimestampTrigger(target),
      vibrate: [300, 150, 300, 150, 600],
      icon: '/misteriosalien-genas/icons/icon-192.png',
      badge: '/misteriosalien-genas/icons/icon-192.png',
      tag: String(reminder.id),
      renotify: true,
      requireInteraction: true,
    })
    return true
  } catch {
    return false
  }
}

async function cancelNativeNotification(id) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const notifications = await reg.getNotifications({ tag: String(id) })
    notifications.forEach(n => n.close())
  } catch {}
}

export function useReminders() {
  const [reminders, setReminders] = useState(() => loadReminders())

  const addReminder = useCallback(async (reminder) => {
    const newReminder = { ...reminder, id: Date.now(), done: false, scheduled: false }
    const scheduled = await scheduleNativeNotification(newReminder)
    newReminder.scheduled = scheduled
    setReminders(prev => {
      const updated = [...prev, newReminder]
      saveReminders(updated)
      return updated
    })
    return newReminder
  }, [])

  const deleteReminder = useCallback((id) => {
    cancelNativeNotification(id)
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
