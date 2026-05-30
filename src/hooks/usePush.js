import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

export function usePush() {
  const [subscription, setSubscription] = useState(null)
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('urantia_backend_url') || '')

  useEffect(() => {
    if (!backendUrl) return
    initPush(backendUrl)
  }, [backendUrl])

  async function initPush(url) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const res = await fetch(`${url}/api/vapid-public-key`)
      if (!res.ok) return
      const { publicKey } = await res.json()

      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }
      setSubscription(sub)
    } catch (err) {
      console.error('Push init:', err)
    }
  }

  function saveBackendUrl(url) {
    const trimmed = url.trim().replace(/\/$/, '')
    localStorage.setItem('urantia_backend_url', trimmed)
    setBackendUrl(trimmed)
  }

  async function sendReminderToBackend(reminder) {
    if (!backendUrl || !subscription) return
    try {
      await fetch(`${backendUrl}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: String(reminder.id),
          title: reminder.title,
          type: reminder.type,
          datetime: reminder.datetime,
          subscription: subscription.toJSON(),
        }),
      })
    } catch (err) {
      console.error('Backend sync:', err)
    }
  }

  async function deleteReminderFromBackend(id) {
    if (!backendUrl) return
    try {
      await fetch(`${backendUrl}/api/reminders/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Backend delete:', err)
    }
  }

  return { subscription, backendUrl, saveBackendUrl, sendReminderToBackend, deleteReminderFromBackend }
}
