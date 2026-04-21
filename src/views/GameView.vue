<template>
  <div class="game-page">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-brand">
        <span class="dot" v-for="c in game.COLORS.slice(0,4)" :key="c.id" :style="{ background: c.hex }" />
        <span class="brand-name">ChromaSequence</span>
      </div>
      <div class="topbar-actions">
        <span class="date-chip">{{ todayLabel }}</span>
        <button class="icon-btn" title="Ranking" @click="router.push('/leaderboard?game=chromasequence')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </button>
        <button class="icon-btn" title="Cerrar sesión" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>

    <main class="game-main">

      <!-- Loading -->
      <div v-if="loading" class="state-msg">
        <div class="spinner" />
        <p>Cargando el reto de hoy...</p>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="state-msg state-error">
        <p>{{ loadError }}</p>
        <button class="btn-outline" @click="init">Reintentar</button>
      </div>

      <!-- Ya jugó hoy -->
      <div v-else-if="game.alreadyPlayed" class="already-played">
        <p class="big-icon">{{ game.todayResult?.won ? '🎉' : '😔' }}</p>
        <h2>{{ game.todayResult?.won ? '¡Reto completado!' : 'Mañana será mejor' }}</h2>
        <p class="muted">Vuelve mañana para un nuevo desafío.</p>
        <p class="countdown-small">Próximo reto en <strong>{{ countdown }}</strong></p>
        <div class="already-btns">
          <button class="btn-primary" @click="router.push('/result?game=chromasequence')">Ver mi resultado</button>
          <button class="btn-outline" @click="router.push('/leaderboard?game=chromasequence')">Ranking de hoy</button>
        </div>
      </div>

      <!-- JUEGO ACTIVO -->
      <div v-else class="game-content">

        <!-- Meta row: intentos + dificultad + timer -->
        <div class="meta-row">
          <AttemptsTracker :remaining="game.attemptsLeft" :max="game.maxAttempts" />
          <div class="difficulty-chip" :class="`diff-${game.challenge?.difficulty}`">
            {{ diffLabel }}
          </div>
          <div class="timer-chip" :class="{ 'timer-running': timer.elapsedMs.value > 0 }">
            {{ timerDisplay }}
          </div>
        </div>

        <!-- Status banner -->
        <Transition name="fade">
          <div class="status-banner" :class="bannerClass" :key="game.status">
            <span class="status-icon">{{ statusIcon }}</span>
            <p>{{ statusMsg }}</p>
          </div>
        </Transition>

        <!-- Progress dots -->
        <ProgressBar
          v-if="game.challenge"
          :sequence="game.challenge.sequence"
          :filled="game.playerSequence.length"
          :colors="game.COLORS"
          :input-mode="game.status === 'input'"
        />

        <!-- Color grid -->
        <div class="color-grid">
          <ColorButton
            v-for="color in game.COLORS"
            :key="color.id"
            :ref="el => { if (el) colorRefs[color.id] = el }"
            :color="color"
            :active="animator.isActive(color.id)"
            :disabled="game.status !== 'input'"
            @press="handlePress"
          />
        </div>

        <!-- Action buttons -->
        <div class="action-row">
          <button
            v-if="game.status === 'idle'"
            class="btn-primary"
            @click="handleWatch"
          >
            {{ game.attempts === 0 ? '▶ Ver secuencia' : '↺ Ver de nuevo' }}
          </button>

          <button
            v-if="game.status === 'watching'"
            class="btn-primary"
            disabled
          >
            Observa...
          </button>

          <button
            v-if="game.status === 'idle' && game.attempts > 0"
            class="btn-outline"
            @click="game.startInput(); timer.start()"
          >
            Repetir sin verla
          </button>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useSequenceAnimator, useTimer } from '@/composables/useGame'
import ColorButton     from '@/components/ColorButton.vue'
import ProgressBar     from '@/components/ProgressBar.vue'
import AttemptsTracker from '@/components/AttemptsTracker.vue'

const router   = useRouter()
const auth     = useAuthStore()
const game     = useGameStore()
const animator = useSequenceAnimator()
const timer    = useTimer()

const loading   = ref(true)
const loadError = ref('')
const colorRefs = ref({})
const countdown = ref('')

// ── Countdown ────────────────────────────────────────────────────────────────
let _countInterval = null
function updateCountdown() {
  const now = new Date()
  const tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1)
  tmr.setHours(0, 0, 0, 0)
  const diff = tmr - now
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0')
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  countdown.value = `${h}:${m}:${s}`
}

onMounted(() => {
  updateCountdown()
  _countInterval = setInterval(updateCountdown, 1000)
  init()
})
onUnmounted(() => {
  clearInterval(_countInterval)
  timer.reset()
})

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  loading.value = true
  loadError.value = ''
  try {
    await game.loadDailyChallenge()
  } catch (e) {
    loadError.value = 'No se pudo cargar el reto. Comprueba tu conexión.'
  } finally {
    loading.value = false
  }
}

// ── Computed ─────────────────────────────────────────────────────────────────
const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
)

const diffLabel = computed(() =>
  ({ easy: 'Fácil', medium: 'Medio', hard: 'Difícil' })[game.challenge?.difficulty] ?? ''
)

const timerDisplay = computed(() => {
  if (game.status !== 'input' || timer.elapsedMs.value === 0) return '—'
  return timer.formatted.value
})

const statusMsg = computed(() => ({
  idle:     game.attempts === 0
              ? 'Pulsa ▶ para ver la secuencia de colores.'
              : `Intento ${game.attempts + 1} de ${game.maxAttempts}. ¡Otra vez!`,
  watching: 'Memoriza bien el orden...',
  input:    `Repite: paso ${game.playerSequence.length + 1} de ${game.sequenceLen}`,
  won:      '¡Correcto! Guardando resultado...',
  lost:     'Se acabaron los intentos. ¡Mañana a por ello!'
})[game.status] ?? '')

const statusIcon = computed(() => ({
  idle: '💡', watching: '👀', input: '🎯', won: '✅', lost: '❌'
})[game.status] ?? '')

const bannerClass = computed(() => ({
  'banner-watching': game.status === 'watching',
  'banner-input':    game.status === 'input',
  'banner-won':      game.status === 'won',
  'banner-lost':     game.status === 'lost'
}))

// ── Handlers ─────────────────────────────────────────────────────────────────
async function handleWatch() {
  game.watchSequence()
  const speeds = {
    easy:   { stepMs: 850, flashMs: 560 },
    medium: { stepMs: 700, flashMs: 480 },
    hard:   { stepMs: 580, flashMs: 380 }
  }
  const opts = speeds[game.challenge?.difficulty] ?? speeds.medium
  await animator.playSequence(game.challenge.sequence, opts)
  game.startInput()
  timer.start()
}

async function handlePress(colorId) {
  await animator.flashColor(colorId, 140)
  game.pressColor(colorId)

  // Si error (secuencia reseteada) → animar shake en el botón
  if (game.playerSequence.length === 0 && game.status !== 'won') {
    colorRefs.value[colorId]?.triggerError()
    timer.reset()
  }

  if (game.status === 'won') {
    timer.stop()
    setTimeout(() => router.push('/result?game=chromasequence'), 1100)
  } else if (game.status === 'lost') {
    timer.reset()
    setTimeout(() => router.push('/result?game=chromasequence'), 1400)
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  background: var(--color-background-tertiary);
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.25rem;
  background: var(--color-background-primary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-brand { display: flex; align-items: center; gap: 6px; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.brand-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.topbar-actions { display: flex; align-items: center; gap: 8px; }
.date-chip { font-size: 11px; color: var(--color-text-tertiary); text-transform: capitalize; }
.icon-btn {
  background: transparent; border: none; cursor: pointer;
  color: var(--color-text-secondary); display: flex; padding: 5px;
  border-radius: 6px; transition: background 0.15s;
}
.icon-btn:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }

.game-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
}

.state-msg {
  display: flex; flex-direction: column; align-items: center;
  gap: 1rem; color: var(--color-text-secondary); text-align: center;
}
.state-error { color: var(--color-text-danger); }
.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--color-border-tertiary);
  border-top-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.already-played {
  text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 0.6rem; max-width: 320px;
}
.big-icon { font-size: 52px; }
.already-played h2 { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
.muted { font-size: 14px; color: var(--color-text-secondary); }
.countdown-small { font-size: 13px; color: var(--color-text-tertiary); }
.countdown-small strong { color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.already-btns { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 0.5rem; }

.game-content {
  width: 100%; max-width: 400px;
  display: flex; flex-direction: column; gap: 1.1rem;
}

.meta-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
}
.difficulty-chip, .timer-chip {
  font-size: 12px; font-weight: 500;
  padding: 4px 10px; border-radius: 20px;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
  border: 0.5px solid var(--color-border-tertiary);
}
.diff-easy   { color: #3B6D11; background: #EAF3DE; border-color: #C0DD97; }
.diff-medium { color: #854F0B; background: #FAEEDA; border-color: #FAC775; }
.diff-hard   { color: #A32D2D; background: #FCEBEB; border-color: #F7C1C1; }
.timer-chip { font-variant-numeric: tabular-nums; letter-spacing: 0.03em; }
.timer-running { color: var(--color-text-primary); }

.status-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-secondary);
}
.status-banner .status-icon { font-size: 16px; flex-shrink: 0; }
.status-banner p { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
.banner-watching { border-color: #B5D4F4; background: #E6F1FB; }
.banner-watching p { color: #185FA5; }
.banner-input { border-color: #FAC775; background: #FAEEDA; }
.banner-input p { color: #854F0B; }
.banner-won { border-color: #C0DD97; background: #EAF3DE; }
.banner-won p { color: #3B6D11; }
.banner-lost { border-color: #F7C1C1; background: #FCEBEB; }
.banner-lost p { color: #A32D2D; }

.color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-row { display: flex; flex-direction: column; gap: 8px; }

.btn-primary {
  background: var(--color-text-primary);
  color: var(--color-background-primary);
  border: none; padding: 14px; border-radius: 10px;
  font-size: 15px; font-weight: 500; cursor: pointer;
  width: 100%; transition: opacity 0.15s;
}
.btn-primary:disabled { opacity: 0.4; cursor: default; }
.btn-outline {
  background: transparent; color: var(--color-text-primary);
  border: 0.5px solid var(--color-border-secondary);
  padding: 12px; border-radius: 10px; font-size: 14px;
  cursor: pointer; width: 100%; transition: background 0.15s;
}
.btn-outline:hover { background: var(--color-background-secondary); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
