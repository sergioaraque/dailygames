<template>
  <GameShell
    title="PathFinder"
    subtitle="Lleva a S hasta E y suma bonus en casillas azules"
    icon-bg="#E6F1FB"
    game-type="pathfinder"
    :already-played="store.alreadyPlayed"
    :today-result="store.todayResult"
    :loading="loading"
    :load-error="loadError"
    @retry="init"
  >
    <template #meta>
      <div class="meta-row">
        <div class="chip">
          <span class="chip-label">pasos</span>
          <span class="chip-val">{{ store.moves }}</span>
        </div>
        <div class="chip chip-pos">
          <span class="chip-label">bonus</span>
          <span class="chip-val">{{ store.score >= 0 ? '+' : '' }}{{ store.score }}</span>
        </div>
        <div class="chip chip-goal">
          <span class="chip-label">objetivo</span>
          <span class="chip-val">S → E</span>
        </div>
      </div>
    </template>

    <template #game>
      <div class="instruction-card">
        <strong>Cómo jugar</strong>
        <p>Mueve solo a casillas vecinas. Llega de <span>S</span> a <span>E</span>. Las azules dan +1 bonus.</p>
      </div>

      <!-- Grid -->
      <div class="grid" :style="{ '--sz': store.gridSize }">
        <template v-for="r in store.gridSize" :key="'row'+r">
          <button
            v-for="c in store.gridSize"
            :key="`${r}-${c}`"
            class="cell"
            :class="cellClass(r-1, c-1)"
            :style="{ background: cellBg(r-1, c-1) }"
            :disabled="!store.canStep(r-1, c-1)"
            @click="store.step(r-1, c-1)"
          >
            <span v-if="isStart(r-1,c-1)" class="cell-label">S</span>
            <span v-else-if="isEnd(r-1,c-1)" class="cell-label">E</span>
            <span v-else-if="stepNumber(r-1,c-1)" class="step-num">{{ stepNumber(r-1,c-1) }}</span>
          </button>
        </template>
      </div>

      <!-- Acciones -->
      <div class="action-row">
        <button class="btn-ghost" @click="store.reset()" :disabled="store.status !== 'playing'">
          Reiniciar camino
        </button>
      </div>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePathFinderStore } from './store'
import GameShell from '@/components/GameShell.vue'

const store     = usePathFinderStore()
const loading   = ref(true)
const loadError = ref('')

const COLOR_HEX = {
  white: 'var(--color-background-primary)',
  blue:  '#E6F1FB',
  green: '#EAF3DE'
}

onMounted(init)
async function init() {
  loading.value = true; loadError.value = ''
  try { await store.load() } catch (e) { loadError.value = e.message } finally { loading.value = false }
}

function isStart(r, c) { return store.start[0]===r && store.start[1]===c }
function isEnd(r, c)   { return store.end[0]===r   && store.end[1]===c }
function stepNumber(r, c) {
  const idx = store.path.findIndex(([pr,pc]) => pr===r && pc===c)
  return idx > 0 ? idx : null
}

function cellBg(r, c) {
  if (!store.grid.length) return '#fff'
  const color = store.grid[r][c]
  return COLOR_HEX[color] ?? '#fff'
}

function cellClass(r, c) {
  const inPath  = store.isInPath(r, c)
  const canStep = store.canStep(r, c)
  const isCurrent = store.currentPos && store.currentPos[0]===r && store.currentPos[1]===c
  return {
    'cell-path':    inPath,
    'cell-current': isCurrent,
    'cell-can':     canStep,
    'cell-start':   isStart(r,c),
    'cell-end':     isEnd(r,c)
  }
}
</script>

<style scoped>
.meta-row { display: flex; gap: 8px; justify-content: center; }
.chip { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 14px; display: flex; flex-direction: column; align-items: center; min-width: 70px; }
.chip-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.chip-val { font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
.chip-pos .chip-val { color: #3B6D11; }
.chip-goal { border-color: #B5D4F4; background: #E6F1FB; }
.chip-goal .chip-val { color: #185FA5; }

.instruction-card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--color-border-tertiary);
  border-radius: 12px;
  padding: 10px 12px;
  text-align: center;
}
.instruction-card strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--color-text-secondary); margin-bottom: 4px; }
.instruction-card p { margin: 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.45; }
.instruction-card span { font-weight: 700; color: var(--color-text-primary); }

.grid {
  display: grid;
  grid-template-columns: repeat(var(--sz), 1fr);
  gap: 5px;
  max-width: 320px;
  margin: 0 auto;
}
.cell {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-tertiary);
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: transform .1s, border-color .1s;
  position: relative;
}
.cell-can   { cursor: pointer; border-style: dashed; }
.cell-can:hover { transform: translateY(-1px); }
.cell-path  { border-width: 2px; border-color: #7F77DD; }
.cell-current { border-color: #534AB7; border-width: 2.5px; }
.cell-start { border-color: #1D9E75; border-width: 2px; }
.cell-end   { border-color: #E24B4A; border-width: 2px; }
.cell-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); }
.step-num { font-size: 11px; color: #5B50C9; font-weight: 600; }

.action-row { display: flex; justify-content: center; }
.btn-ghost { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 8px 20px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
.btn-ghost:hover { background: var(--color-background-secondary); }
.btn-ghost:disabled { opacity: .35; cursor: default; }
</style>
