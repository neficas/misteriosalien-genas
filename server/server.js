const express = require('express')
const cors = require('cors')
const webpush = require('web-push')
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ─── JSON file storage (no native deps needed) ───────────────
const DATA_FILE = path.join(__dirname, 'data.json')

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { vapid: null, reminders: [] }
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// ─── VAPID keys ──────────────────────────────────────────────
let store = readData()
if (!store.vapid) {
  store.vapid = webpush.generateVAPIDKeys()
  writeData(store)
}
webpush.setVapidDetails('mailto:urantia@app.local', store.vapid.publicKey, store.vapid.privateKey)

// ─── Routes ─────────────────────────────────────────────────
app.get('/ping', (req, res) => res.send('OK'))

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: readData().vapid.publicKey })
})

app.post('/api/reminders', (req, res) => {
  const { id, title, type, datetime, subscription } = req.body
  if (!id || !title || !datetime || !subscription) return res.status(400).json({ error: 'Missing fields' })
  const data = readData()
  data.reminders = data.reminders.filter(r => r.id !== id)
  data.reminders.push({ id, title, type: type || 'text', datetime, subscription, done: false })
  writeData(data)
  res.json({ ok: true })
})

app.delete('/api/reminders/:id', (req, res) => {
  const data = readData()
  data.reminders = data.reminders.filter(r => r.id !== req.params.id)
  writeData(data)
  res.json({ ok: true })
})

// ─── Cron: check every minute ────────────────────────────────
cron.schedule('* * * * *', async () => {
  const data = readData()
  const now = Date.now()
  let changed = false

  for (const r of data.reminders) {
    if (r.done) continue
    const target = new Date(r.datetime).getTime()
    if (now >= target && now - target < 65000) {
      try {
        await webpush.sendNotification(r.subscription, JSON.stringify({
          id: r.id,
          title: r.title,
          body: r.type === 'voice' ? `Recordatorio de voz: ${r.title}` : r.title,
          type: r.type,
        }))
        r.done = true
        changed = true
        console.log(`Push sent: ${r.title}`)
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          r.done = true
          changed = true
        }
        console.error(`Push error ${r.id}:`, err.message)
      }
    }
  }
  if (changed) writeData(data)
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Urantia server on port ${PORT}`))
