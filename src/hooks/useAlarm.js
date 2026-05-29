import { useEffect, useRef, useState } from 'react'
import { playAlarmSound, speakText, vibrateAlarm } from '../utils/audio'

export function useAlarm(reminders, markDone) {
  const [activeAlarm, setActiveAlarm] = useState(null)
  const [flashing, setFlashing] = useState(false)
  const flashRef = useRef(null)
  const alarmLoopRef = useRef(null)
  const checkedRef = useRef(new Set())

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      reminders.forEach(r => {
        if (r.done || checkedRef.current.has(r.id)) return
        const target = new Date(r.datetime).getTime()
        if (now >= target && now - target < 60000) {
          checkedRef.current.add(r.id)
          triggerAlarm(r)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [reminders])

  function triggerAlarm(reminder) {
    setActiveAlarm(reminder)
    startFlash()
    startAlarmLoop(reminder)
    requestNotification(reminder)
  }

  function startFlash() {
    setFlashing(true)
    let count = 0
    flashRef.current = setInterval(() => {
      count++
      if (count > 20) {
        clearInterval(flashRef.current)
        setFlashing(false)
      }
    }, 500)
  }

  function startAlarmLoop(reminder) {
    let loops = 0
    playAlarmSound()
    vibrateAlarm()
    if (reminder.type === 'text') speakText(reminder.title)

    alarmLoopRef.current = setInterval(() => {
      loops++
      if (loops >= 5) {
        clearInterval(alarmLoopRef.current)
        return
      }
      playAlarmSound()
      vibrateAlarm()
      if (reminder.type === 'text') speakText(reminder.title)
    }, 4000)
  }

  function dismissAlarm() {
    clearInterval(flashRef.current)
    clearInterval(alarmLoopRef.current)
    setFlashing(false)
    if (activeAlarm) markDone(activeAlarm.id)
    setActiveAlarm(null)
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }

  function requestNotification(reminder) {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification('Urantia — Recordatorio', {
        body: reminder.title,
        icon: '/icons/icon-192.png',
        vibrate: [300, 150, 300],
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('Urantia', { body: reminder.title })
      })
    }
  }

  return { activeAlarm, flashing, dismissAlarm }
}
