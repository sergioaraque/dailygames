<template>
  <div class="shell-page">
    <!-- Top bar compartida -->
    <header class="topbar">
      <button class="icon-btn" @click="router.push('/hub')" title="Volver al hub">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <div class="topbar-center">
        <div class="game-icon" :style="{ background: iconBg }">
          <slot name="icon">
            <span style="font-size:14px;">🎮</span>
          </slot>
        </div>
        <div>
          <p class="game-title">{{ title }}</p>
          <p class="game-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <button class="icon-btn" @click="router.push('/leaderboard?game=' + gameType)" title="Ranking">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </button>
    </header>

    <main class="shell-main">
      <!-- Loading -->
      <div v-if="loading" class="center-state">
        <div class="spinner" />
        <p>Cargando reto de hoy...</p>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="center-state center-error">
        <p>{{ loadError }}</p>
        <button class="btn-outline" @click="$emit('retry')">Reintentar</button>
      </div>

      <!-- Ya jugó -->
      <div v-else-if="alreadyPlayed" class="center-state">
        <p class="big-icon">{{ todayResult?.won ? '🎉' : '😔' }}</p>
        <h2>{{ todayResult?.won ? '¡Reto superado!' : 'Mañana lo intentas' }}</h2>
        <p class="muted">Siguiente reto en <strong>{{ countdown }}</strong></p>
        <div class="already-btns">
          <button class="btn-primary" @click="router.push('/result?game=' + gameType)">Ver resultado</button>
          <button class="btn-outline" @click="router.push('/hub')">Volver al hub</button>
        </div>
      </div>

      <!-- Estado ganó / perdió overlay -->
      <Transition name="slide-up">
        <div v-if="showEndBanner" class="end-banner" :class="todayResult?.won ? 'end-won' : 'end-lost'">
          <p class="end-icon">{{ todayResult?.won ? '✅' : '❌' }}</p>
          <p class="end-msg">{{ todayResult?.won ? '¡Correcto!' : 'Sin más intentos' }}</p>
          <button class="btn-result" @click="router.push('/result?game=' + gameType)">Ver resultado</button>
        </div>
      </Transition>

      <!-- Contenido del juego -->
      <div v-if="!loading && !loadError && !alreadyPlayed" class="game-inner">
        <div class="meta-wrap">
          <slot name="meta" />
        </div>
        <div class="game-wrap">
          <slot name="game" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  title:        { type: String, required: true },
  subtitle:     { type: String, default: '' },
  iconBg:       { type: String, default: '#EEEDFE' },
  gameType:     { type: String, required: true },
  alreadyPlayed:{ type: Boolean, default: false },
  todayResult:  { type: Object, default: null },
  loading:      { type: Boolean, default: true },
  loadError:    { type: String, default: '' }
})
defineEmits(['retry'])

const countdown = ref('')
const showEndBanner = ref(false)

let _interval = null
onMounted(() => { update(); _interval = setInterval(update, 1000) })
onUnmounted(() => clearInterval(_interval))

function update() {
  const now = new Date(), tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1); tmr.setHours(0,0,0,0)
  const d = tmr - now
  const h = String(Math.floor(d/3600000)).padStart(2,'0')
  const m = String(Math.floor((d%3600000)/60000)).padStart(2,'0')
  const s = String(Math.floor((d%60000)/1000)).padStart(2,'0')
  countdown.value = `${h}:${m}:${s}`
}

watch(() => props.todayResult, (val) => {
  if (val) setTimeout(() => { showEndBanner.value = true }, 600)
})
</script>

<style scoped>
.shell-page { min-height: 100vh; background: var(--color-background-tertiary); display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--color-background-primary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
  position: sticky; top: 0; z-index: 10;
}
.topbar-center { display: flex; align-items: center; gap: 10px; }
.game-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.game-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.game-subtitle { font-size: 11px; color: var(--color-text-tertiary); margin: 0; }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--color-text-secondary); display: flex; padding: 6px; border-radius: 6px; transition: background .15s; }
.icon-btn:hover { background: var(--color-background-secondary); }
.shell-main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 1.25rem 1rem; position: relative; }
.center-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; text-align: center; padding: 3rem 0; color: var(--color-text-secondary); }
.center-error { color: var(--color-text-danger); }
.spinner { width: 26px; height: 26px; border: 2px solid var(--color-border-tertiary); border-top-color: var(--color-text-secondary); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.big-icon { font-size: 48px; }
.center-state h2 { font-size: 18px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.muted { font-size: 13px; color: var(--color-text-tertiary); }
.muted strong { font-variant-numeric: tabular-nums; }
.already-btns { display: flex; flex-direction: column; gap: 8px; width: 240px; margin-top: 0.5rem; }
.btn-primary { width: 100%; padding: 12px; background: var(--color-text-primary); color: var(--color-background-primary); border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-outline { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 10px; padding: 11px; font-size: 14px; cursor: pointer; color: var(--color-text-primary); }
.btn-outline:hover { background: var(--color-background-secondary); }
.game-inner { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 1rem; }
.meta-wrap { }
.game-wrap { display: flex; flex-direction: column; gap: 1rem; }
.end-banner {
  position: absolute; bottom: 1.5rem;
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 2rem); max-width: 380px;
  border-radius: 14px; padding: 1rem 1.25rem;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
  z-index: 20;
}
.end-won { background: #EAF3DE; border: 1px solid #C0DD97; }
.end-lost { background: #FCEBEB; border: 1px solid #F7C1C1; }
.end-icon { font-size: 24px; flex-shrink: 0; }
.end-msg { flex: 1; font-size: 15px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.btn-result { background: var(--color-text-primary); color: var(--color-background-primary); border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.slide-up-enter-active { transition: transform .3s ease, opacity .3s ease; }
.slide-up-enter-from { transform: translateX(-50%) translateY(20px); opacity: 0; }
</style>
