<template>
  <GameShell
    title="Buscaminas"
    subtitle="Despeja todas las casillas seguras"
    icon-bg="#F8E4EA"
    game-type="buscaminas"
    :already-played="store.alreadyPlayed"
    :today-result="store.todayResult"
    :loading="loading"
    :load-error="loadError"
    @retry="init"
  >
    <template #meta>
      <div class="meta-row">
        <div class="chip">
          <span class="chip-label">minas</span>
          <span class="chip-val">{{ store.mineCount }}</span>
        </div>
        <div class="chip">
          <span class="chip-label">banderas</span>
          <span class="chip-val">{{ store.flagsLeft }}</span>
        </div>
        <div class="chip" :class="{ 'chip-live': timerRunning }">
          <span class="chip-label">tiempo</span>
          <span class="chip-val mono">{{ timerDisplay }}</span>
        </div>
      </div>
    </template>

    <template #game>
      <p class="hint">Toca para revelar. Activa Marcar para poner banderas.</p>

      <div class="summary-strip">
        <div class="summary-item">
          <span class="summary-label">seguras abiertas</span>
          <strong>{{ store.revealedSafeCount }}/{{ store.safeCells }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">casillas tocadas</span>
          <strong>{{ store.touched.size }}</strong>
        </div>
      </div>

      <div class="legend">
        <span class="legend-item"><i class="legend-swatch swatch-open"></i> abierta</span>
        <span class="legend-item"><i class="legend-swatch swatch-touch"></i> tocada</span>
        <span class="legend-item"><i class="legend-swatch swatch-flag"></i> bandera</span>
        <span class="legend-item"><i class="legend-swatch swatch-mine"></i> mina</span>
      </div>

      <div class="action-row">
        <button class="btn-ghost" :class="{ 'btn-ghost-active': markMode }" @click="markMode = !markMode" :disabled="store.status !== 'playing'">
          {{ markMode ? 'Modo: Marcar' : 'Modo: Revelar' }}
        </button>
        <button class="btn-ghost" @click="resetCurrent" :disabled="store.status !== 'playing'">Reiniciar</button>
      </div>

      <div class="board" :style="{ '--sz': store.size }">
        <button
          v-for="i in store.totalCells"
          :key="i"
          class="cell"
          :class="cellClass(i - 1)"
          @click="onCellClick(i - 1)"
          @contextmenu.prevent="onCellFlag(i - 1)"
          :disabled="store.status !== 'playing'"
        >
          <span v-if="showFlag(i - 1)">🚩</span>
          <span v-else-if="showMine(i - 1)">💣</span>
          <span v-else-if="showNumber(i - 1)" :class="`n-${numberAt(i - 1)}`">{{ numberAt(i - 1) }}</span>
          <span v-else-if="showTapIcon(i - 1)" class="tap-icon">◻</span>
        </button>
      </div>

      <p v-if="store.status === 'lost'" class="end-text">Pisaste una mina. Manana sale otro reto.</p>
      <p v-if="store.status === 'won'" class="end-text end-win">Tablero despejado. Buen trabajo.</p>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBuscaminasStore } from './store'
import GameShell from '@/components/GameShell.vue'
import { useTimer } from '@/composables/useGame'

const store = useBuscaminasStore()
const timer = useTimer()

const loading = ref(true)
const loadError = ref('')
const markMode = ref(false)
const timerRunning = ref(false)

onMounted(init)
onUnmounted(() => timer.reset())

async function init() {
  loading.value = true
  loadError.value = ''
  markMode.value = false
  timer.reset()
  timerRunning.value = false

  try {
    await store.load()
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

const timerDisplay = computed(() => {
  const ms = timer.elapsedMs.value
  if (!ms) return '0.00s'
  const s = Math.floor(ms / 1000)
  const c = Math.floor((ms % 1000) / 10)
  return `${s}.${String(c).padStart(2, '0')}s`
})

function toRowCol(i) {
  return [Math.floor(i / store.size), i % store.size]
}

function onCellClick(i) {
  const [r, c] = toRowCol(i)

  if (!timerRunning.value && store.status === 'playing') {
    timer.start()
    timerRunning.value = true
  }

  if (markMode.value) store.toggleFlag(r, c)
  else store.reveal(r, c)

  if (store.status === 'won' || store.status === 'lost') {
    store.elapsedMs = timer.stop()
    timerRunning.value = false
  }
}

function onCellFlag(i) {
  const [r, c] = toRowCol(i)
  if (!timerRunning.value && store.status === 'playing') {
    timer.start()
    timerRunning.value = true
  }
  store.toggleFlag(r, c)
}

function resetCurrent() {
  timer.reset()
  timerRunning.value = false
  markMode.value = false
  store.resetBoard()
}

function numberAt(i) {
  const [r, c] = toRowCol(i)
  return store.cellNumber(r, c)
}

function showFlag(i) {
  const [r, c] = toRowCol(i)
  return store.isFlagged(r, c) && !store.isRevealed(r, c)
}

function showMine(i) {
  const [r, c] = toRowCol(i)
  if (store.status !== 'lost') return false
  return store.isMine(r, c)
}

function showNumber(i) {
  const [r, c] = toRowCol(i)
  return store.isRevealed(r, c) && numberAt(i) > 0
}

function showTapIcon(i) {
  const [r, c] = toRowCol(i)
  return !store.isRevealed(r, c) && !store.isFlagged(r, c)
}

function cellClass(i) {
  const [r, c] = toRowCol(i)
  const revealed = store.isRevealed(r, c)
  const mine = store.isMine(r, c)
  const exploded = store.explodedCell === i

  return {
    'cell-revealed': revealed,
    'cell-hidden': !revealed,
    'cell-mine': exploded,
    'cell-safe': revealed && !mine
  }
}
</script>

<style scoped>
.meta-row { display: flex; gap: 8px; justify-content: center; }
.chip { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 14px; display: flex; flex-direction: column; align-items: center; min-width: 74px; }
.chip-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.chip-val { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.chip-live .chip-val { color: #854F0B; }
.mono { font-variant-numeric: tabular-nums; }

.hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; }
.action-row { display: flex; gap: 8px; justify-content: center; }

.btn-ghost {
  background: transparent;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.btn-ghost:hover { background: var(--color-background-secondary); }
.btn-ghost:disabled { opacity: .4; cursor: default; }
.btn-ghost-active {
  background: #F8E4EA;
  border-color: #D4A7B2;
  color: #8A3E50;
}

.board {
  display: grid;
  grid-template-columns: repeat(var(--sz), 1fr);
  gap: 5px;
  max-width: 340px;
  margin: 0 auto;
}
.cell {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid #a7b4c8;
  background: #f3f6fb;
  color: #24324a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  line-height: 1;
  user-select: none;
}
.tap-icon {
  color: #8a99b0;
  font-size: 18px;
}
.cell-hidden:hover { background: #e8eef8; }
.cell-revealed {
  background: #ffffff;
  border-color: #d3dcea;
}
.cell-safe { box-shadow: inset 0 0 0 1px #edf2fa; }
.cell-mine {
  background: #fce8eb;
  border-color: #e89aa8;
}

.n-1 { color: #2a6bb2; }
.n-2 { color: #2e8b57; }
.n-3 { color: #be4e34; }
.n-4 { color: #5f4eb2; }
.n-5 { color: #904733; }
.n-6 { color: #0c7e88; }
.n-7 { color: #454d5a; }
.n-8 { color: #20242b; }

.end-text { text-align: center; font-size: 13px; color: var(--color-text-secondary); }
.end-win { color: #2f6d2e; }
</style>
