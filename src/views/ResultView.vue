<template>
  <div class="result-page">
    <header class="topbar">
      <button class="icon-btn" @click="router.push('/hub')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </button>
      <span class="topbar-title">Resultado</span>
      <button class="icon-btn" @click="router.push(`/leaderboard?game=${gameType}`)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </button>
    </header>

    <main class="result-main">
      <div class="result-card">

        <!-- Header -->
        <div class="result-header">
          <div class="game-badge" :style="{ background: GAME_META[gameType]?.iconBg }">
            <span class="game-emoji">{{ GAME_META[gameType]?.emoji }}</span>
          </div>
          <div>
            <p class="game-name">{{ GAME_META[gameType]?.name }}</p>
            <p class="date-label">{{ todayLabel }}</p>
          </div>
          <div class="result-icon">{{ result?.won ? '🎉' : '😔' }}</div>
        </div>

        <!-- Stats grid -->
        <div class="stats-grid" v-if="result">
          <div class="stat">
            <span class="stat-val">{{ result.attempts }}</span>
            <span class="stat-label">intentos</span>
          </div>
          <div class="stat" v-if="result.timeMs">
            <span class="stat-val">{{ formatMs(result.timeMs) }}</span>
            <span class="stat-label">tiempo</span>
          </div>
          <div class="stat" v-if="result.moves">
            <span class="stat-val">{{ result.moves }}</span>
            <span class="stat-label">movimientos</span>
          </div>
          <div class="stat" v-if="result.score !== undefined && result.score !== null">
            <span class="stat-val">{{ result.score >= 0 ? '+' : '' }}{{ result.score }}</span>
            <span class="stat-label">puntos</span>
          </div>
          <div class="stat" v-if="stats">
            <span class="stat-val">{{ stats.streak }}</span>
            <span class="stat-label">racha</span>
          </div>
          <div class="stat" v-if="stats">
            <span class="stat-val">{{ stats.totalWins }}</span>
            <span class="stat-label">victorias</span>
          </div>
        </div>

        <!-- Share -->
        <div class="share-section">
          <pre class="share-text">{{ shareText }}</pre>
          <button class="btn-copy" @click="copyShare">
            {{ copied ? '¡Copiado!' : 'Copiar resultado' }}
          </button>
        </div>

        <!-- Badges -->
        <div v-if="badges.length" class="badges-wrap">
          <p class="badges-title">Logros del día</p>
          <div class="badges-list">
            <span v-for="badge in badges" :key="badge.key" class="badge-pill">
              {{ badge.icon }} {{ badge.label }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions">
          <button class="btn-outline" @click="router.push(`/leaderboard?game=${gameType}`)">
            Ver ranking de hoy
          </button>
          <button class="btn-ghost" :disabled="replaying" @click="handleReplay">
            {{ replaying ? 'Reiniciando...' : 'Volver a jugar' }}
          </button>
          <p v-if="replayError" class="inline-error">{{ replayError }}</p>
          <button class="btn-link" @click="router.push('/hub')">
            Volver al hub
          </button>
        </div>

        <!-- Countdown -->
        <p class="countdown">Próximo reto en <strong>{{ countdown }}</strong></p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { databases, functions, DATABASE_ID, COLLECTION_RESULTS, COLLECTION_STATS, FUNCTION_REPLAY_CLEANUP } from '@/appwrite'
import { Query } from 'appwrite'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const result   = ref(null)
const stats    = ref(null)
const copied   = ref(false)
const countdown = ref('')
const replaying = ref(false)
const replayError = ref('')

const gameType = computed(() => route.query.game || 'chromasequence')

const GAME_META = {
  chromasequence: { name: 'ChromaSequence', emoji: '🎨', iconBg: '#EEEDFE' },
  numflow:        { name: 'NumFlow',        emoji: '🔢', iconBg: '#EEEDFE' },
  pathfinder:     { name: 'PathFinder',     emoji: '🗺️', iconBg: '#E6F1FB' },
  buscaminas:     { name: 'Buscaminas',     emoji: '💣', iconBg: '#F8E4EA' },
  sunmoon:        { name: 'Soles y Lunas',  emoji: '☀️', iconBg: '#FDEFD5' },
  memorygrid:     { name: 'MemoryGrid',     emoji: '🧠', iconBg: '#E7F6F0' }
}

const REPLAY_ROUTES = {
  chromasequence: '/game',
  numflow: '/numflow',
  pathfinder: '/pathfinder',
  buscaminas: '/buscaminas',
  sunmoon: '/sunmoon',
  memorygrid: '/memorygrid'
}

const badges = computed(() => {
  if (!result.value) return []

  const list = []
  if (result.value.won && Number(result.value.attempts) === 1) {
    list.push({ key: 'firsttry', icon: '🎯', label: 'Primer intento' })
  }
  if (result.value.won && Number(result.value.timeMs || 0) > 0 && Number(result.value.timeMs) <= 45000) {
    list.push({ key: 'fast', icon: '⚡', label: 'Ritmo veloz' })
  }
  if (result.value.won && Number(result.value.moves || 0) > 0 && Number(result.value.moves) <= 12) {
    list.push({ key: 'efficient', icon: '🧩', label: 'Muy eficiente' })
  }
  if (Number(stats.value?.streak || 0) >= 3) {
    list.push({ key: 'streak', icon: '🔥', label: `Racha x${stats.value.streak}` })
  }
  if (Number(stats.value?.bestStreak || 0) >= 7) {
    list.push({ key: 'consistency', icon: '🏅', label: 'Constancia semanal' })
  }
  if (Number(stats.value?.totalWins || 0) >= 25) {
    list.push({ key: 'veteran', icon: '👑', label: 'Veterano' })
  }

  return list
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
)

function formatMs(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const c = Math.floor((ms % 1000) / 10)
  return s < 60 ? `${s}.${String(c).padStart(2,'0')}s` : `${Math.floor(s/60)}m ${s%60}s`
}

const shareText = computed(() => {
  if (!result.value) return ''
  const meta = GAME_META[gameType.value]
  const won  = result.value.won
  const att  = result.value.attempts
  const time = result.value.timeMs ? formatMs(result.value.timeMs) : ''
  const mvs  = result.value.moves  ? `${result.value.moves} mov.` : ''
  const detail = [time, mvs].filter(Boolean).join(' · ')
  const date = new Date().toLocaleDateString('es-ES')
  return `${meta?.emoji} ${meta?.name} — ${date}\n${won ? '✅' : '❌'} ${att} intento${att !== 1 ? 's' : ''}${detail ? ' · ' + detail : ''}\n🎮 ¡Juega en dailygames.app!`
})

async function copyShare() {
  await navigator.clipboard.writeText(shareText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function yesterdayStr(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function waitExecution(functionId, executionId) {
  for (let i = 0; i < 24; i++) {
    const current = await functions.getExecution(functionId, executionId)
    if (current.status === 'completed' || current.status === 'failed' || current.status === 'cancelled') {
      return current
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('La funcion de replay no termino a tiempo')
}

async function handleReplay() {
  replayError.value = ''

  if (!result.value) {
    router.push(REPLAY_ROUTES[gameType.value] ?? '/hub')
    return
  }

  replaying.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const started = await functions.createExecution(
      FUNCTION_REPLAY_CLEANUP,
      JSON.stringify({
        userId: auth.user.$id,
        gameType: gameType.value,
        date: today
      }),
      false
    )

    const execution = await waitExecution(FUNCTION_REPLAY_CLEANUP, started.$id)

    if (execution.status !== 'completed') {
      throw new Error(execution.errors || `Replay cleanup status: ${execution.status}`)
    }

    if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
      const detail = execution.responseBody || execution.errors || 'Error en replay cleanup'
      throw new Error(detail)
    }

    // Appwrite puede tardar un instante en reflejar el borrado en consultas.
    for (let i = 0; i < 6; i++) {
      const check = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
        Query.equal('userId', auth.user.$id),
        Query.equal('date', today),
        Query.equal('gameType', gameType.value),
        Query.limit(1)
      ])
      if (check.documents.length === 0) break
      await new Promise(resolve => setTimeout(resolve, 250))
    }

    router.push(REPLAY_ROUTES[gameType.value] ?? '/hub')
  } catch (error) {
    console.error(error)
    const detail = error?.message || 'Error desconocido'
    replayError.value = mapReplayError(detail)
  } finally {
    replaying.value = false
  }
}

function mapReplayError(detail) {
  const text = String(detail || '').toLowerCase()

  if (text.includes('timed out') || text.includes('no termino a tiempo')) {
    return 'El reinicio esta tardando mas de lo normal. Intentalo otra vez en unos segundos.'
  }
  if (text.includes('network') || text.includes('failed to fetch')) {
    return 'No hay conexion estable con el servidor. Revisa internet e intentalo de nuevo.'
  }
  if (text.includes('unauthorized') || text.includes('not authorized') || text.includes('forbidden') || text.includes('permission')) {
    return 'Tu sesion no tiene permisos para reiniciar ahora mismo. Cierra sesion y vuelve a entrar.'
  }
  if (text.includes('function') && text.includes('not found')) {
    return 'La funcion de reinicio no esta disponible temporalmente. Avisa al administrador.'
  }
  if (text.includes('userid') || text.includes('no se pudo determinar el usuario')) {
    return 'No pudimos validar tu usuario para este reinicio. Prueba cerrando sesion y entrando otra vez.'
  }

  return 'No se pudo reiniciar la partida anterior. Vuelve a intentarlo en unos segundos.'
}

function pickBestResult(docs) {
  if (!docs?.length) return null
  return docs.reduce((best, current) => {
    if (!best) return current
    if (current.won && !best.won) return current
    if (!current.won && best.won) return best
    const cAttempts = Number(current.attempts ?? Number.MAX_SAFE_INTEGER)
    const bAttempts = Number(best.attempts ?? Number.MAX_SAFE_INTEGER)
    if (cAttempts !== bAttempts) return cAttempts < bAttempts ? current : best
    const cTime = Number(current.timeMs ?? Number.MAX_SAFE_INTEGER)
    const bTime = Number(best.timeMs ?? Number.MAX_SAFE_INTEGER)
    return cTime < bTime ? current : best
  }, null)
}

let _interval = null
function updateCountdown() {
  const now = new Date(), tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1); tmr.setHours(0, 0, 0, 0)
  const d = tmr - now
  const h = String(Math.floor(d / 3600000)).padStart(2, '0')
  const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((d % 60000) / 1000)).padStart(2, '0')
  countdown.value = `${h}:${m}:${s}`
}

onMounted(async () => {
  updateCountdown()
  _interval = setInterval(updateCountdown, 1000)

  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', auth.user.$id),
      Query.equal('date', today),
      Query.equal('gameType', gameType.value),
      Query.limit(50)
    ])
    result.value = pickBestResult(res.documents)
  } catch { /**/ }

  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_STATS, [
      Query.equal('userId', auth.user.$id),
      Query.equal('gameType', gameType.value),
      Query.limit(1)
    ])
    stats.value = res.documents[0] ?? null
  } catch { /**/ }
})

onUnmounted(() => clearInterval(_interval))
</script>

<style scoped>
.result-page { min-height: 100vh; background: var(--color-background-tertiary); display: flex; flex-direction: column; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.25rem; background: var(--color-background-primary); border-bottom: 0.5px solid var(--color-border-tertiary); }
.topbar-title { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--color-text-secondary); display: flex; padding: 5px; border-radius: 6px; transition: background .15s; }
.icon-btn:hover { background: var(--color-background-secondary); }
.result-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.5rem 1rem; }
.result-card { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1.25rem; }
.result-header { display: flex; align-items: center; gap: 12px; }
.game-badge { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.game-emoji { font-size: 22px; }
.game-name { font-size: 16px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.date-label { font-size: 12px; color: var(--color-text-tertiary); margin: 0; text-transform: capitalize; }
.result-icon { font-size: 32px; margin-left: auto; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stat { background: var(--color-background-secondary); border-radius: 10px; padding: 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val { font-size: 20px; font-weight: 500; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.stat-label { font-size: 11px; color: var(--color-text-tertiary); }
.share-section { display: flex; flex-direction: column; gap: 8px; }
.share-text { font-size: 13px; color: var(--color-text-secondary); background: var(--color-background-secondary); border-radius: 8px; padding: 10px 12px; white-space: pre-wrap; margin: 0; font-family: var(--font-mono); }
.btn-copy { width: 100%; padding: 11px; border-radius: 8px; background: var(--color-text-primary); color: var(--color-background-primary); border: none; font-size: 14px; font-weight: 500; cursor: pointer; }
.badges-wrap { display: flex; flex-direction: column; gap: 8px; }
.badges-title { margin: 0; font-size: 12px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .05em; }
.badges-list { display: flex; gap: 6px; flex-wrap: wrap; }
.badge-pill { background: #edf6f2; color: #2f5e4a; border: 1px solid #c4dece; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 500; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.btn-outline { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 11px; font-size: 14px; cursor: pointer; color: var(--color-text-primary); width: 100%; }
.btn-outline:hover { background: var(--color-background-secondary); }
.btn-ghost { background: transparent; border: none; padding: 8px; font-size: 13px; color: var(--color-text-tertiary); cursor: pointer; width: 100%; }
.btn-ghost:hover { color: var(--color-text-secondary); }
.btn-ghost:disabled { opacity: .6; cursor: default; }
.inline-error { margin: 0; font-size: 12px; color: #b63838; text-align: center; background: #fdebec; border: 1px solid #f5c8cb; border-radius: 8px; padding: 8px 10px; }
.btn-link { background: transparent; border: none; padding: 4px 8px 0; font-size: 12px; color: var(--color-text-tertiary); cursor: pointer; width: 100%; }
.btn-link:hover { color: var(--color-text-secondary); }
.countdown { font-size: 12px; color: var(--color-text-tertiary); text-align: center; margin: 0; }
.countdown strong { font-variant-numeric: tabular-nums; color: var(--color-text-secondary); }
</style>
