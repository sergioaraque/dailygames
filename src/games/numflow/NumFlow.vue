<template>
  <GameShell
    title="NumFlow"
    subtitle="Ordena los números moviendo una pieza a la vez"
    icon-bg="#EEEDFE"
    game-type="numflow"
    :already-played="store.alreadyPlayed"
    :today-result="store.todayResult"
    :loading="loading"
    :load-error="loadError"
    @retry="init"
  >
    <template #meta>
      <div class="meta-row">
        <div class="chip">
          <span class="chip-label">movimientos</span>
          <span class="chip-val">{{ store.moves }}</span>
        </div>
        <div class="chip" :class="{ 'chip-live': timerRunning }">
          <span class="chip-label">tiempo</span>
          <span class="chip-val mono">{{ timerDisplay }}</span>
        </div>
      </div>
    </template>

    <template #game>
      <p class="hint">Pulsa una pieza adyacente al hueco para moverla.</p>

      <div class="board" :style="{ '--sz': store.size }">
        <button
          v-for="(val, idx) in store.board"
          :key="idx"
          class="tile"
          :class="{
            'tile-blank':  val === 0,
            'tile-can':    store.canMove(idx) && val !== 0,
            'tile-correct': val !== 0 && val === idx + 1
          }"
          :disabled="val === 0 || !store.canMove(idx)"
          @click="handleMove(idx)"
        >
          <span v-if="val !== 0">{{ val }}</span>
        </button>
      </div>

      <div class="action-row">
        <button class="btn-ghost" @click="store.giveUp" :disabled="store.status !== 'playing'">
          Rendirse
        </button>
      </div>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNumFlowStore } from './store'
import GameShell from '@/components/GameShell.vue'
import { useTimer } from '@/composables/useGame'

const store  = useNumFlowStore()
const timer  = useTimer()
const loading   = ref(true)
const loadError = ref('')
const timerRunning = ref(false)

onMounted(init)
onUnmounted(() => timer.reset())

async function init() {
  loading.value = true; loadError.value = ''
  try { await store.load() } catch (e) { loadError.value = e.message } finally { loading.value = false }
  if (!store.alreadyPlayed) { timer.start(); timerRunning.value = true }
}

const timerDisplay = computed(() => {
  const ms = timer.elapsedMs.value
  if (!ms) return '0.00s'
  const s = Math.floor(ms / 1000)
  const c = Math.floor((ms % 1000) / 10)
  return `${s}.${String(c).padStart(2,'0')}s`
})

function handleMove(idx) {
  store.move(idx)
  if (store.status === 'won') {
    store.elapsedMs = timer.stop()
    timerRunning.value = false
  }
}
</script>

<style scoped>
.meta-row { display: flex; gap: 8px; justify-content: center; }
.chip { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 14px; display: flex; flex-direction: column; align-items: center; min-width: 90px; }
.chip-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.chip-val { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.chip-live .chip-val { color: #854F0B; }
.mono { font-variant-numeric: tabular-nums; }
.hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; }
.board {
  display: grid;
  grid-template-columns: repeat(var(--sz), 1fr);
  gap: 6px;
  max-width: 320px;
  margin: 0 auto;
}
.tile {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-secondary);
  background: var(--color-background-primary);
  font-size: 20px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: default;
  transition: background .12s, transform .1s, border-color .12s;
  display: flex; align-items: center; justify-content: center;
}
.tile-blank { background: var(--color-background-tertiary); border-color: transparent; }
.tile-can { cursor: pointer; border-color: #7F77DD; }
.tile-can:hover { background: #EEEDFE; transform: scale(1.04); }
.tile-can:active { transform: scale(.96); }
.tile-correct { background: #EAF3DE; border-color: #97C459; color: #27500A; }
.action-row { display: flex; justify-content: center; }
.btn-ghost { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 8px 20px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
.btn-ghost:hover { background: var(--color-background-secondary); }
.btn-ghost:disabled { opacity: .35; cursor: default; }
</style>
