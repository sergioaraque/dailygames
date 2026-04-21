// src/stores/baseGame.js
// Lógica compartida entre todos los juegos diarios.
// Cada juego crea su propio store que llama a estas funciones.

import { ref } from 'vue'
import { databases } from '@/appwrite'
import { DATABASE_ID, COLLECTION_RESULTS, COLLECTION_STATS } from '@/appwrite'
import { Query, ID } from 'appwrite'

export function createBaseGameStore(gameType) {
  const challenge      = ref(null)
  const status         = ref('idle')   // idle | playing | won | lost
  const attempts       = ref(0)
  const maxAttempts    = ref(3)
  const elapsedMs      = ref(0)
  const alreadyPlayed  = ref(false)
  const todayResult    = ref(null)
  const moves          = ref(0)        // usado por NumFlow

  function todayStr() {
    return new Date().toISOString().slice(0, 10)
  }
  function yesterdayStr(baseDate) {
    const d = baseDate ? new Date(baseDate) : new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  async function loadChallenge(userId) {
    const today = todayStr()
    const res = await databases.listDocuments(DATABASE_ID, 'daily_challenges', [
      Query.equal('date', today),
      Query.equal('gameType', gameType),
      Query.limit(1)
    ])
    if (!res.documents.length) throw new Error(`Sin reto para hoy (${gameType})`)
    challenge.value = res.documents[0]
    await checkPlayed(userId, today)
    return challenge.value
  }

  async function checkPlayed(userId, date) {
    alreadyPlayed.value = false
    todayResult.value = null

    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', userId),
      Query.equal('date', date),
      Query.equal('gameType', gameType),
      Query.limit(50)
    ])

    if (res.documents.length) {
      alreadyPlayed.value = true
      todayResult.value   = pickBestResult(res.documents)
      return
    }

    alreadyPlayed.value = false
    todayResult.value = null
  }

  function isBetterResult(next, current) {
    if (!current) return true
    if (next.won && !current.won) return true
    if (!next.won && current.won) return false

    if (gameType === 'pathfinder') {
      const nextScore = Number(next.score ?? Number.NEGATIVE_INFINITY)
      const curScore  = Number(current.score ?? Number.NEGATIVE_INFINITY)
      if (nextScore !== curScore) return nextScore > curScore
    }

    const nextAttempts = Number(next.attempts ?? Number.MAX_SAFE_INTEGER)
    const curAttempts  = Number(current.attempts ?? Number.MAX_SAFE_INTEGER)
    if (nextAttempts !== curAttempts) return nextAttempts < curAttempts

    const nextMoves = Number(next.moves ?? 0)
    const curMoves  = Number(current.moves ?? 0)
    if (nextMoves !== curMoves) return nextMoves < curMoves

    const nextTime = Number(next.timeMs ?? Number.MAX_SAFE_INTEGER)
    const curTime  = Number(current.timeMs ?? Number.MAX_SAFE_INTEGER)
    return nextTime < curTime
  }

  function pickBestResult(docs) {
    if (!docs.length) return null
    return docs.reduce((best, current) => (isBetterResult(current, best) ? current : best), docs[0])
  }

  async function saveResult(userId, userName, won, extra = {}) {
    const date = todayStr()
    const doc = {
      userId, userName, date, gameType,
      won,
      attempts:  attempts.value + (won ? 1 : 0),
      timeMs:    elapsedMs.value,
      moves:     moves.value,
      challengeId: challenge.value?.$id,
      ...extra
    }

    const existingRes = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', userId),
      Query.equal('date', date),
      Query.equal('gameType', gameType),
      Query.limit(50)
    ])

    const currentBest = pickBestResult(existingRes.documents)
    let persisted = currentBest

    if (!currentBest) {
      persisted = await databases.createDocument(
        DATABASE_ID, COLLECTION_RESULTS, ID.unique(), doc
      )
    } else if (isBetterResult(doc, currentBest)) {
      persisted = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_RESULTS,
        currentBest.$id,
        doc
      )
    }

    todayResult.value  = persisted
    alreadyPlayed.value = true
    await rebuildStats(userId)
    return persisted
  }

  async function rebuildStats(userId) {
    const all = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', userId),
      Query.equal('gameType', gameType),
      Query.orderAsc('date'),
      Query.limit(1000)
    ])

    const docs = all.documents
    const totalGames = docs.length
    const totalWins = docs.filter(d => d.won).length

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

    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_STATS, [
      Query.equal('userId', userId),
      Query.equal('gameType', gameType),
      Query.limit(1)
    ])

    if (existing.documents.length > 0) {
      await databases.updateDocument(DATABASE_ID, COLLECTION_STATS, existing.documents[0].$id, payload)
    } else if (docs.length > 0) {
      await databases.createDocument(DATABASE_ID, COLLECTION_STATS, ID.unique(), payload)
    }
  }

  async function getLeaderboard() {
    const today = todayStr()
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('date', today),
      Query.equal('gameType', gameType),
      Query.equal('won', true),
      Query.orderAsc('moves'),
      Query.orderAsc('timeMs'),
      Query.limit(20)
    ])
    return res.documents
  }

  function reset() {
    status.value    = 'idle'
    attempts.value  = 0
    elapsedMs.value = 0
    moves.value     = 0
  }

  return {
    challenge, status, attempts, maxAttempts,
    elapsedMs, alreadyPlayed, todayResult, moves,
    loadChallenge, saveResult, getLeaderboard, reset
  }
}
