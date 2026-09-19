import { openDB } from 'idb'

const DB_NAME = 'aural-db'
const DB_VERSION = 1

let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const tracks = db.createObjectStore('tracks', { keyPath: 'id' })
        tracks.createIndex('by-addedAt', 'addedAt')
        tracks.createIndex('by-album', 'album')
        tracks.createIndex('by-artist', 'artist')

        const playlists = db.createObjectStore('playlists', { keyPath: 'id' })
        playlists.createIndex('by-createdAt', 'createdAt')

        db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

// --- Tracks -----------------------------------------------------------

export async function addTrack(track) {
  const db = await getDb()
  await db.put('tracks', track)
  return track
}

export async function getAllTracks() {
  const db = await getDb()
  return db.getAllFromIndex('tracks', 'by-addedAt')
}

export async function getTrack(id) {
  const db = await getDb()
  return db.get('tracks', id)
}

export async function deleteTrack(id) {
  const db = await getDb()
  await db.delete('tracks', id)
}

export async function updateTrack(track) {
  const db = await getDb()
  await db.put('tracks', track)
}

// --- Playlists ----------------------------------------------------------

export async function getAllPlaylists() {
  const db = await getDb()
  return db.getAllFromIndex('playlists', 'by-createdAt')
}

export async function savePlaylist(playlist) {
  const db = await getDb()
  await db.put('playlists', playlist)
  return playlist
}

export async function deletePlaylist(id) {
  const db = await getDb()
  await db.delete('playlists', id)
}

// --- Settings -------------------------------------------------------------

export async function getSetting(key, fallback) {
  const db = await getDb()
  const row = await db.get('settings', key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  const db = await getDb()
  await db.put('settings', { key, value })
}

// --- Storage usage --------------------------------------------------------

export async function estimateStorageUsage() {
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate()
    return { usage, quota }
  }
  return { usage: 0, quota: 0 }
}
