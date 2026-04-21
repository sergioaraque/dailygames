<template>
  <GameShell
    title="Soles y Lunas"
    subtitle="Completa el tablero respetando las pistas"
    icon-bg="#FDEFD5"
    game-type="sunmoon"
    :already-played="store.alreadyPlayed"
    :today-result="store.todayResult"
    :loading="loading"
    :load-error="loadError"
    @retry="init"
  >
    <template #meta>
      <div class="meta-row">
        <div class="chip">
          <span class="chip-label">tamaño</span>
          <span class="chip-val">{{ store.size }}x{{ store.size }}</span>
        </div>
        <div class="chip">
          <span class="chip-label">movimientos</span>
          <span class="chip-val">{{ store.moves }}</span>
        </div>
        <div class="chip">
          <span class="chip-label">relleno</span>
          <span class="chip-val">{{ store.filledCount }}/{{ store.totalCells }}</span>
        </div>
      </div>
    </template>

    <template #game>
      <p class="hint">
        Cada fila y columna debe tener la misma cantidad de soles y lunas.
      </p>

      <div class="validation-wrap">
        <div class="validation-line">
          <span class="validation-label">Filas</span>
          <span
            v-for="(row, idx) in store.rowStatus"
            :key="`row-${idx}`"
            class="validation-badge"
            :class="{ 'badge-ok': row.valid, 'badge-warn': !row.valid }"
          >
            F{{ idx + 1 }}
          </span>
        </div>
        <div class="validation-line">
          <span class="validation-label">Columnas</span>
          <span
            v-for="(col, idx) in store.colStatus"
            :key="`col-${idx}`"
            class="validation-badge"
            :class="{ 'badge-ok': col.valid, 'badge-warn': !col.valid }"
          >
            C{{ idx + 1 }}
          </span>
        </div>
      </div>

      <div class="board" :style="{ '--sz': store.size }">
        <button
          v-for="i in store.totalCells"
          :key="i"
          class="cell"
          :class="cellClass(i - 1)"
          @click="onCell(i - 1)"
          :disabled="store.status !== 'playing'"
        >
          <span class="icon">{{ iconFor(i - 1) }}</span>
        </button>
      </div>

      <div class="action-row">
        <button class="btn-ghost" @click="store.resetBoard" :disabled="store.status !== 'playing'">Reiniciar</button>
        <button class="btn-ghost" @click="store.giveUp" :disabled="store.status !== 'playing'">Rendirse</button>
      </div>
    </template>
  </GameShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSunMoonStore } from './store'
import GameShell from '@/components/GameShell.vue'

const store = useSunMoonStore()
const loading = ref(true)
const loadError = ref('')

onMounted(init)

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
}

function toRowCol(i) {
  return [Math.floor(i / store.size), i % store.size]
}

function onCell(i) {
  const [r, c] = toRowCol(i)
  store.cycleCell(r, c)
}

function iconFor(i) {
  const [r, c] = toRowCol(i)
  const value = store.cell(r, c)
  if (value === 'sun') return '☀'
  if (value === 'moon') return '☾'
  return '·'
}

function cellClass(i) {
  const [r, c] = toRowCol(i)
  const value = store.cell(r, c)
  const rowOk = store.rowStatus?.[r]?.valid ?? true
  const colOk = store.colStatus?.[c]?.valid ?? true

  return {
    'cell-fixed': store.isFixed(r, c),
    'cell-empty': value === null,
    'cell-sun': value === 'sun',
    'cell-moon': value === 'moon',
    'cell-invalid': value !== null && (!rowOk || !colOk)
  }
}
</script>

<style scoped>
.meta-row { display: flex; gap: 8px; justify-content: center; }
.chip { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 12px; display: flex; flex-direction: column; align-items: center; min-width: 78px; }
.chip-label { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
.chip-val { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }

.hint { font-size: 13px; color: var(--color-text-tertiary); text-align: center; }

.validation-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  margin: 0 auto 2px;
}
.validation-line { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.validation-label { font-size: 11px; color: var(--color-text-tertiary); min-width: 54px; }
.validation-badge {
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid transparent;
  font-weight: 600;
}
.badge-ok { background: #e7f6e9; color: #2b7a36; border-color: #bfe4c5; }
.badge-warn { background: #fdebec; color: #ad2f35; border-color: #f4c3c7; }

.board {
  display: grid;
  grid-template-columns: repeat(var(--sz), 1fr);
  gap: 6px;
  max-width: 320px;
  margin: 0 auto;
}

.cell {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-secondary);
  background: var(--color-background-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .1s, background .12s, border-color .12s;
}
.cell:hover { transform: translateY(-1px); }
.cell:disabled { cursor: default; }

.icon {
  font-size: 22px;
  line-height: 1;
}

.cell-empty .icon { color: #9ca8bc; font-size: 20px; }
.cell-sun { background: #fff5de; border-color: #f1c46d; }
.cell-sun .icon { color: #c48721; }
.cell-moon { background: #edf2ff; border-color: #b4c2ef; }
.cell-moon .icon { color: #5569b2; }
.cell-fixed { box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); }
.cell-invalid { border-color: #dd6e78; box-shadow: inset 0 0 0 1px #f0a9b0; }

.action-row { display: flex; gap: 8px; justify-content: center; }
.btn-ghost { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 8px 18px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; }
.btn-ghost:hover { background: var(--color-background-secondary); }
.btn-ghost:disabled { opacity: .35; cursor: default; }
</style>
