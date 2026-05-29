const KEY = 'urantia_reminders'

export function loadReminders() {
  try {
    const data = localStorage.getItem(KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveReminders(reminders) {
  localStorage.setItem(KEY, JSON.stringify(reminders))
}
