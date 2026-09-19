export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQ_PRESETS = {
  Plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Bajos: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  Agudos: [0, 0, 0, 0, 0, 1, 3, 5, 6, 6],
  Electrónica: [4, 3, 0, -1, -2, 0, 2, 3, 4, 5],
}

function createDeck(context) {
  const audio = new Audio()
  audio.crossOrigin = 'anonymous'
  audio.preload = 'auto'

  const source = context.createMediaElementSource(audio)
  const filters = EQ_BANDS.map((freq) => {
    const filter = context.createBiquadFilter()
    filter.type = 'peaking'
    filter.frequency.value = freq
    filter.Q.value = 1.1
    filter.gain.value = 0
    return filter
  })
  const gainNode = context.createGain()
  gainNode.gain.value = 1

  source.connect(filters[0])
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1])
  filters[filters.length - 1].connect(gainNode)
  gainNode.connect(context.destination)

  return { audio, source, filters, gainNode }
}

export class AudioEngine {
  constructor() {
    this.context = null
    this.decks = null
    this.activeIndex = 0
    this.crossfadeSeconds = 0
    this.crossfadeTimer = null
    this.listeners = { timeupdate: [], ended: [], play: [], pause: [], loadedmetadata: [], crossfaded: [] }
  }

  ensureContext() {
    if (this.context) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    this.context = new Ctx()
    this.decks = [createDeck(this.context), createDeck(this.context)]
    this.decks.forEach((deck, i) => this._bindDeckEvents(deck, i))
  }

  _bindDeckEvents(deck, index) {
    deck.audio.addEventListener('timeupdate', () => {
      if (index === this.activeIndex) this._emit('timeupdate', this.getProgress())
      this._maybeStartCrossfade(deck, index)
    })
    deck.audio.addEventListener('ended', () => {
      if (index === this.activeIndex && !this._crossfading) this._emit('ended')
    })
    deck.audio.addEventListener('play', () => {
      if (index === this.activeIndex) this._emit('play')
    })
    deck.audio.addEventListener('pause', () => {
      if (index === this.activeIndex) this._emit('pause')
    })
    deck.audio.addEventListener('loadedmetadata', () => {
      if (index === this.activeIndex) this._emit('loadedmetadata', deck.audio.duration)
    })
  }

  on(event, cb) {
    this.listeners[event].push(cb)
    return () => {
      this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb)
    }
  }

  _emit(event, payload) {
    this.listeners[event].forEach((cb) => cb(payload))
  }

  get activeDeck() {
    return this.decks[this.activeIndex]
  }

  get inactiveDeck() {
    return this.decks[1 - this.activeIndex]
  }

  async resume() {
    this.ensureContext()
    if (this.context.state === 'suspended') await this.context.resume()
  }

  async loadAndPlay(url) {
    await this.resume()
    this._cancelCrossfade()
    const deck = this.activeDeck
    this.inactiveDeck.audio.pause()
    this.inactiveDeck.audio.removeAttribute('src')
    deck.gainNode.gain.cancelScheduledValues(this.context.currentTime)
    deck.gainNode.gain.setValueAtTime(1, this.context.currentTime)
    deck.audio.src = url
    deck.audio.currentTime = 0
    this._preloadedNext = null
    await deck.audio.play()
  }

  play() {
    return this.activeDeck?.audio.play()
  }

  pause() {
    this.activeDeck?.audio.pause()
  }

  seek(time) {
    if (this.activeDeck) this.activeDeck.audio.currentTime = time
  }

  setVolume(value) {
    this.decks?.forEach((deck) => {
      deck.audio.volume = value
    })
  }

  getProgress() {
    const audio = this.activeDeck?.audio
    if (!audio) return { currentTime: 0, duration: 0 }
    return { currentTime: audio.currentTime, duration: audio.duration || 0 }
  }

  setEQBand(index, dB) {
    this.decks?.forEach((deck) => {
      deck.filters[index].gain.value = dB
    })
  }

  setEQPreset(values) {
    values.forEach((v, i) => this.setEQBand(i, v))
  }

  setCrossfadeSeconds(seconds) {
    this.crossfadeSeconds = seconds
  }

  prepareNext(url) {
    this._nextUrl = url
    this._preloadedNext = false
  }

  _maybeStartCrossfade(deck, index) {
    if (this.crossfadeSeconds <= 0) return
    if (index !== this.activeIndex) return
    if (this._crossfading) return
    if (!this._nextUrl) return
    const { currentTime, duration } = deck.audio
    if (!duration || Number.isNaN(duration)) return
    const remaining = duration - currentTime
    if (remaining <= this.crossfadeSeconds && remaining > 0) {
      this._startCrossfade()
    }
  }

  async _startCrossfade() {
    if (!this._nextUrl || this._crossfading) return
    this._crossfading = true
    const from = this.activeDeck
    const to = this.inactiveDeck
    const url = this._nextUrl
    this._nextUrl = null

    to.audio.src = url
    to.audio.currentTime = 0
    to.gainNode.gain.cancelScheduledValues(this.context.currentTime)
    to.gainNode.gain.setValueAtTime(0, this.context.currentTime)

    try {
      await to.audio.play()
    } catch {
      this._crossfading = false
      return
    }

    const now = this.context.currentTime
    const duration = this.crossfadeSeconds
    from.gainNode.gain.cancelScheduledValues(now)
    from.gainNode.gain.setValueAtTime(from.gainNode.gain.value, now)
    from.gainNode.gain.linearRampToValueAtTime(0, now + duration)
    to.gainNode.gain.cancelScheduledValues(now)
    to.gainNode.gain.setValueAtTime(0, now)
    to.gainNode.gain.linearRampToValueAtTime(1, now + duration)

    this.crossfadeTimer = setTimeout(() => {
      from.audio.pause()
      from.audio.removeAttribute('src')
      this.activeIndex = 1 - this.activeIndex
      this._crossfading = false
      this._emit('crossfaded', { duration: this.activeDeck.audio.duration || 0 })
    }, duration * 1000)
  }

  _cancelCrossfade() {
    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer)
      this.crossfadeTimer = null
    }
    this._crossfading = false
    this._nextUrl = null
  }

  destroy() {
    this._cancelCrossfade()
    this.decks?.forEach((deck) => {
      deck.audio.pause()
      deck.audio.removeAttribute('src')
    })
  }
}
