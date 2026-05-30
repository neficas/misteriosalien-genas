const express = require('express')
const cors = require('cors')
const webpush = require('web-push')
const Database = require('better-sqlite3')
const cron = require('node-cron')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ─── Database ───────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'urantia.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS vapid (
    id INTEGER PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    datetime TEXT NOT NULL,
    subscription TEXT NOT NULL,
    done INTEGER DEFAULT 0
  );
`)

// ─── VAPID keys (generated once, stored in DB) ──────────────
let vapid = db.prepare('SELECT * FROM vapid WHERE id = 1').get()
if (!vapid) {
  const keys = webpush.generateVAPIDKeys()
  db.prepare('INSERT INTO vapid (id, public_key, private_key) VALUES (1, ?, ?)').run(keys.publicKey, keys.privateKey)
  vapid = { public_key: keys.publicKey, private_key: keys.privateKey }
}
webpush.setVapidDetails('mailto:urantia@app.local', vapid.public_key, vapid.private_key)

// ─── Routes ─────────────────────────────────────────────────
app.get('/ping', (req, res) => res.send('OK'))

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapid.public_key })
})

app.post('/api/reminders', (req, res) => {
  const { id, title, type, datetime, subscription } = req.body
  if (!id || !title || !datetime || !subscription) return res.status(400).json({ error: 'Missing fields' })
  db.prepare(`
    INSERT OR REPLACE INTO reminders (id, title, type, datetime, subscription, done)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, title, type || 'text', datetime, JSON.stringify(subscription))
  res.json({ ok: true })
})

app.delete('/api/reminders/:id', (req, res) => {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ─── Cron: send push every minute for due reminders ─────────
cron.schedule('* * * * *', async () => {
  const now = Date.now()
  const pending = db.prepare('SELECT * FROM reminders WHERE done = 0').all()

  for (const r of pending) {
    const target = new Date(r.datetime).getTime()
    if (now >= target && now - target < 65000) {
      try {
        const sub = JSON.parse(r.subscription)
        await webpush.sendNotification(sub, JSON.stringify({
          id: r.id,
          title: r.title,
          body: r.type === 'voice' ? `Recordatorio de voz: ${r.title}` : r.title,
          type: r.type,
        }))
        db.prepare('UPDATE reminders SET done = 1 WHERE id = ?').run(r.id)
        console.log(`Sent push for: ${r.title}`)
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM reminders WHERE id = ?').run(r.id)
        }
        console.error(`Push failed for ${r.id}:`, err.message)
      }
    }
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Urantia server on port ${PORT}`))
