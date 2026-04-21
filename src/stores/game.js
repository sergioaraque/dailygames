import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { databases, functions } from '@/appwrite'
import { DATABASE_ID, COLLECTION_DAILY, COLLECTION_RESULTS, COLLECTION_STATS } from '@/appwrite'
import { Query, ID } from 'appwrite'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', () => {
  const auth = useAuthStore()

  // Estado del reto diario
  const challenge        = ref(null)   // { date, sequence, difficulty }
  const playerSequence   = ref([])
  const currentStep      = ref(0)
  const attempts         = ref(0)
  const maxAttempts      = 3
  const status           = ref('idle') // idle | watching | input | won | lost
  const startTime        = ref(null)
  const elapsedMs        = ref(0)
  const alreadyPlayed    = ref(false)
  const todayResult      = ref(null)

  // Colores disponibles
  const COLORS = [
    { id: 'red',    hex: '#E24B4A' },
    { id: 'blue',   hex: '#378ADD' },
    { id: 'green',  hex: '#639922' },
    { id: 'amber',  hex: '#EF9F27' },
    { id: 'purple', hex: '#7F77DD' },
    { id: 'teal',   hex: '#1D9E75' }
  ]

  const attemptsLeft  = computed(() => maxAttempts - attempts.value)
  const sequenceLen   = computed(() => challenge.value?.sequence?.length ?? 0)
  const progressPct   = computed(() => Math.round((currentStep.value / sequenceLen.value) * 100))

  // ── Carga el reto del día ───────────────────────────────────────────────────
  async function loadDailyChallenge() {
    const today = todayDateStr()
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_DAILY, [
      Query.equal('date', today),
      Query.equal('gameType', 'chromasequence'),
      Query.limit(1)
    ])
    if (res.documents.length === 0) throw new Error('No hay reto para hoy')
    challenge.value = res.documents[0]
    await checkIfAlreadyPlayed(today)
  }

  async function checkIfAlreadyPlayed(date) {
    alreadyPlayed.value = false
    todayResult.value = null

    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', auth.user.$id),
      Query.equal('date', date),
      Query.equal('gameType', 'chromasequence'),
      Query.limit(50)
    ])

    if (res.documents.length > 0) {
      alreadyPlayed.value = true
      todayResult.value = pickBestResult(res.documents)
      return
    }

    alreadyPlayed.value = false
    todayResult.value = null
  }

  // ── Lógica de animación y juego ────────────────────────────────────────────
  async function watchSequence() {
    status.value = 'watching'
    playerSequence.value = []
    currentStep.value = 0
    // La animación la controla el composable useGame (en el componente)
  }

  function startInput() {
    status.value = 'input'
    if (!startTime.value) startTime.value = Date.now()
  }

  function pressColor(colorId) {
    if (status.value !== 'input') return
    playerSequence.value.push(colorId)
    currentStep.value = playerSequence.value.length

    const seq = challenge.value.sequence
    const idx = playerSequence.value.length - 1

    if (playerSequence.value[idx] !== seq[idx]) {
      // Error
      attempts.value++
      playerSequence.value = []
      currentStep.value = 0
      if (attempts.value >= maxAttempts) {
        status.value = 'lost'
        saveResult(false)
      } else {
        status.value = 'idle'
      }
      return
    }

    if (playerSequence.value.length === seq.length) {
      // Victoria
      elapsedMs.value = Date.now() - startTime.value
      status.value = 'won'
      saveResult(true)
    }
  }

  // ── Persistencia en Appwrite ────────────────────────────────────────────────
  function isBetterResult(next, current) {
    if (!current) return true
    if (next.won && !current.won) return true
    if (!next.won && current.won) return false

    const nextAttempts = Number(next.attempts ?? Number.MAX_SAFE_INTEGER)
    const curAttempts  = Number(current.attempts ?? Number.MAX_SAFE_INTEGER)
    if (nextAttempts !== curAttempts) return nextAttempts < curAttempts

    const nextTime = Number(next.timeMs ?? Number.MAX_SAFE_INTEGER)
    const curTime  = Number(current.timeMs ?? Number.MAX_SAFE_INTEGER)
    return nextTime < curTime
  }

  function pickBestResult(docs) {
    if (!docs.length) return null
    return docs.reduce((best, current) => (isBetterResult(current, best) ? current : best), docs[0])
  }

  async function saveResult(won) {
    const date = todayDateStr()
    const doc = {
      userId:      auth.user.$id,
      userName:    auth.user.name,
      date,
      gameType:    'chromasequence',
      won,
      attempts:    attempts.value + (won ? 1 : 0),
      timeMs:      elapsedMs.value,
      challengeId: challenge.value.$id
    }

    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', auth.user.$id),
      Query.equal('date', date),
      Query.equal('gameType', 'chromasequence'),
      Query.limit(50)
    ])

    const currentBest = pickBestResult(existing.documents)
    let persisted = currentBest

    if (!currentBest) {
      persisted = await databases.createDocument(DATABASE_ID, COLLECTION_RESULTS, ID.unique(), doc)
    } else if (isBetterResult(doc, currentBest)) {
      persisted = await databases.updateDocument(DATABASE_ID, COLLECTION_RESULTS, currentBest.$id, doc)
    }

    todayResult.value = persisted
    alreadyPlayed.value = true
    await rebuildUserStats()
  }

  async function rebuildUserStats() {
    const userId = auth.user.$id
    const gameType = 'chromasequence'
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
    let lastPlayedDate = null
    let previousDate = null

    for (const d of docs) {
      lastPlayedDate = d.date
      if (d.won) {
        streak = previousDate === yesterdayDateStr(d.date) ? streak + 1 : 1
        bestStreak = Math.max(bestStreak, streak)
        if (typeof d.timeMs === 'number' && d.timeMs > 0) {
          bestTimeMs = bestTimeMs === null ? d.timeMs : Math.min(bestTimeMs, d.timeMs)
        }
      }
      previousDate = d.date
    }

    const payload = {
      userId,
      gameType,
      totalGames,
      totalWins,
      streak,
      bestStreak,
      bestTimeMs: bestTimeMs ?? 0,
      lastPlayedDate: lastPlayedDate ?? todayDateStr()
    }

    const statsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_STATS, [
      Query.equal('userId', userId),
      Query.equal('gameType', gameType),
      Query.limit(1)
    ])

    if (statsRes.documents.length > 0) {
      await databases.updateDocument(DATABASE_ID, COLLECTION_STATS, statsRes.documents[0].$id, payload)
    } else if (docs.length > 0) {
      await databases.createDocument(DATABASE_ID, COLLECTION_STATS, ID.unique(), payload)
    }
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  async function getLeaderboard() {
    const today = todayDateStr()
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('date', today),
      Query.equal('gameType', 'chromasequence'),
      Query.equal('won', true),
      Query.orderAsc('timeMs'),
      Query.limit(20)
    ])
    return res.documents
  }

  function reset() {
    playerSequence.value = []
    currentStep.value = 0
    attempts.value = 0
    status.value = 'idle'
    startTime.value = null
    elapsedMs.value = 0
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function todayDateStr() {
    return new Date().toISOString().slice(0, 10)
  }
  function yesterdayDateStr(baseDate) {
    const d = baseDate ? new Date(baseDate) : new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }

  return {
    challenge, playerSequence, currentStep, attempts, maxAttempts,
    status, elapsedMs, alreadyPlayed, todayResult, attemptsLeft,
    sequenceLen, progressPct, COLORS,
    loadDailyChallenge, watchSequence, startInput, pressColor,
    getLeaderboard, reset
  }
})
