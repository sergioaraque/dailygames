<template>
  <GameShell
    title="MemoryGrid"
    subtitle="Encuentra todas las parejas antes de quedarte sin intentos"
    icon-bg="#E7F6F0"
    game-type="memorygrid"
    :already-played="store.alreadyPlayed"
    :today-result="store.todayResult"
    :loading="loading"
    :load-error="loadError"
    @retry="init"
  >
    <template #meta>
      <div class="meta-row">
        <div class="chip">
          <span class="chip-label">parejas</span>
          <span class="chip-val">{{ store.matchedPairs }}/{{ store.totalPairs }}</span>
        </div>
        <div class="chip">
          <span class="chip-label">fallos</span>
          <span class="chip-val">{{ store.attempts }}/{{ store.maxAttempts }}</span>
        </div>
        <div class="chip" :class="{ 'chip-live': timerRunning }">
          <span class="chip-label">tiempo</span>
          <span class="chip-val mono">{{ timerDisplay }}</span>
        </div>
      </div>
    </template>

    <template #game>
      <p class="hint">Pulsa dos cartas para descubrir si forman pareja.</p>

      <div class="board" :style="{ '--sz': store.size }">
        <button
          v-for="(card, index) in store.cards"
          :key="card.id"
          class="card"
          :class="{
            'card-visible': store.visible(card),
            'card-matched': card.matched
          }"
          :disabled="store.locked || card.matched || card.revealed || store.status !== 'playing'"
          @click="handleReveal(index)"
        >
          <span class="card-face">{{ store.visible(card) ? card.value : '•' }}</span>
        </button>
      </div>

      <div class="action-row">
        <button class="btn-ghost" @click="store.resetBoard" :disabled="store.status !== 'playing'">Reiniciar tablero</button>
      </div>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMemoryGridStore } from './store'
import { useTimer } from '@/composables/useGame'
import GameShell from '@/components/GameShell.vue'

const store = useMemoryGridStore()
const timer = useTimer()

const loading = ref(true)
const loadError = ref('')
const timerRunning = ref(false)

onMounted(init)
onUnmounted(() => timer.reset())

async function init() {
  loading.value = true
  loadError.value = ''
  try {
    await store.load()
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }

  if (!store.alreadyPlayed) {
    timer.reset()
    timerRunning.value = false
  }
}

const timerDisplay = computed(() => {
  const ms = timer.elapsedMs.value
  if (!ms) return '0.00s'
  const s = Math.floor(ms / 1000)
  const c = Math.floor((ms % 1000) / 10)
  return `${s}.${String(c).padStart(2, '0')}s`
})

function handleReveal(index) {
  if (!timerRunning.value && store.status === 'playing') {
    timer.start()
    timerRunning.value = true
  }

  store.reveal(index)

  if (store.status === 'won') {
    store.elapsedMs.value = timer.stop()
    timerRunning.value = false
  } else if (store.status === 'lost') {
    timer.stop()
    timerRunning.value = false
  }
}
</script>

<style scoped>
.meta-row { display: flex; gap: 8px; justify-content: center; }
.chip { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 12px; display: flex; flex-direction: column; align-items: center; min-width: 84px; }
.chip-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.chip-val { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.chip-live .chip-val { color: #2f6f54; }
.mono { font-variant-numeric: tabular-nums; }

.hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; }

.board {
  display: grid;
  grid-template-columns: repeat(var(--sz), 1fr);
  gap: 8px;
  max-width: 320px;
  margin: 0 auto;
}

.card {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-secondary);
  background: #dbece6;
  color: #325a4a;
  cursor: pointer;
  transition: transform .1s, background .12s, border-color .12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card:hover { transform: translateY(-1px); }
.card:disabled { cursor: default; }
.card-visible {
  background: var(--color-background-primary);
  border-color: #89b5a2;
}
.card-matched {
  background: #eaf5ef;
  border-color: #79af95;
  color: #285a43;
}
.card-face { font-size: 20px; font-weight: 700; }

.action-row { display: flex; justify-content: center; }
.btn-ghost { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 8px 20px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
.btn-ghost:hover { background: var(--color-background-secondary); }
.btn-ghost:disabled { opacity: .35; cursor: default; }
</style>
