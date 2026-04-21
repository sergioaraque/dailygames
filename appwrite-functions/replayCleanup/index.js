// appwrite-functions/replayCleanup/index.js
// Borra todos los resultados del dia de un usuario para un juego y recalcula sus stats.

import { Client, Databases, ID, Query } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)
const DB = process.env.DATABASE_ID || 'chromasequence'
const COL_RESULTS = process.env.COLLECTION_RESULTS || 'game_results'
const COL_STATS = process.env.COLLECTION_STATS || 'user_stats'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function parseBody(req) {
  if (!req?.body) return {}
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body
}

function header(req, key) {
  const headers = req?.headers || {}
  return headers[key] || headers[key.toLowerCase()] || headers[key.toUpperCase()] || null
}

async function rebuildStats(userId, gameType) {
  const remaining = await db.listDocuments(DB, COL_RESULTS, [
    Query.equal('userId', userId),
    Query.equal('gameType', gameType),
    Query.orderAsc('date'),
    Query.limit(1000)
  ])

  const docs = remaining.documents
  const totalGames = docs.length
  const totalWins = docs.filter(doc => doc.won).length

  let streak = 0
  let bestStreak = 0
  let bestTimeMs = null
  let bestMoves = null
  let lastPlayedDate = null
  let previousDate = null

  for (const doc of docs) {
    lastPlayedDate = doc.date

    if (doc.won) {
      streak = previousDate === yesterdayStr(doc.date) ? streak + 1 : 1
      bestStreak = Math.max(bestStreak, streak)
      if (typeof doc.timeMs === 'number' && doc.timeMs > 0) {
        bestTimeMs = bestTimeMs === null ? doc.timeMs : Math.min(bestTimeMs, doc.timeMs)
      }
      if (typeof doc.moves === 'number' && doc.moves > 0) {
        bestMoves = bestMoves === null ? doc.moves : Math.min(bestMoves, doc.moves)
      }
    }

    previousDate = doc.date
  }

  const payload = {
    userId,
    gameType,
    totalGames,
    totalWins,
    streak,
    bestStreak,
    bestTimeMs: bestTimeMs ?? 0,
    bestMoves: bestMoves ?? 0,
    lastPlayedDate: lastPlayedDate ?? todayStr()
  }

  const existing = await db.listDocuments(DB, COL_STATS, [
    Query.equal('userId', userId),
    Query.equal('gameType', gameType),
    Query.limit(1)
  ])

  if (existing.documents.length > 0) {
    await db.updateDocument(DB, COL_STATS, existing.documents[0].$id, payload)
  } else if (docs.length > 0) {
    await db.createDocument(DB, COL_STATS, ID.unique(), payload)
  }
}

export default async ({ req, res, log, error }) => {
  try {
    const body = parseBody(req)
    const { userId, gameType } = body
    const date = body.date || todayStr()

    const callerUserId = header(req, 'x-appwrite-user-id')

    if (!gameType || !date) {
      return res.json({ ok: false, message: 'Faltan gameType o date' }, 400)
    }

    if (callerUserId && userId && callerUserId !== userId) {
      return res.json({ ok: false, message: 'userId no coincide con la sesion actual' }, 403)
    }

    const targetUserId = callerUserId || userId
    if (!targetUserId) {
      return res.json({ ok: false, message: 'No se pudo determinar el usuario' }, 400)
    }

    const matches = await db.listDocuments(DB, COL_RESULTS, [
      Query.equal('userId', targetUserId),
      Query.equal('gameType', gameType),
      Query.equal('date', date),
      Query.limit(100)
    ])

    for (const doc of matches.documents) {
      await db.deleteDocument(DB, COL_RESULTS, doc.$id)
    }

    await rebuildStats(targetUserId, gameType)

    log(`Replay cleanup OK: ${targetUserId} ${gameType} ${date} (${matches.documents.length} borrados)`)
    return res.json({ ok: true, deleted: matches.documents.length })
  } catch (e) {
    error(`Replay cleanup failed: ${e.message}`)
    return res.json({ ok: false, message: e.message }, 500)
  }
}
