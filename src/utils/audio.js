let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function playAlarmSound() {
  const ac = getCtx()
  const pattern = [
    { freq: 880, start: 0, dur: 0.15 },
    { freq: 660, start: 0.18, dur: 0.15 },
    { freq: 880, start: 0.36, dur: 0.15 },
    { freq: 1100, start: 0.54, dur: 0.3 },
  ]
  pattern.forEach(({ freq, start, dur }) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ac.currentTime + start)
    gain.gain.linearRampToValueAtTime(0.6, ac.currentTime + start + 0.02)
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + start + dur)
    osc.start(ac.currentTime + start)
    osc.stop(ac.currentTime + start + dur + 0.05)
  })
}

export function speakText(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'es-ES'
  utt.rate = 0.9
  utt.pitch = 1
  window.speechSynthesis.speak(utt)
}

export function vibrateAlarm() {
  if (navigator.vibrate) {
    navigator.vibrate([300, 150, 300, 150, 600])
  }
}
