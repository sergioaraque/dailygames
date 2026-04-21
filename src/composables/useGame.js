// src/composables/useGame.js
// Composable que encapsula la lógica de animación de la secuencia
// y expone helpers para los componentes.

import { ref, computed } from 'vue'

export function useSequenceAnimator(colors) {
  const activeColor  = ref(null)   // id del color actualmente iluminado
  const isAnimating  = ref(false)

  // Anima la secuencia con delays configurables
  async function playSequence(sequence, { stepMs = 800, flashMs = 550 } = {}) {
    isAnimating.value = true
    activeColor.value = null

    for (const colorId of sequence) {
      await delay(stepMs - flashMs)        // pausa entre flashes
      activeColor.value = colorId
      await delay(flashMs)
      activeColor.value = null
    }

    isAnimating.value = false
  }

  // Ilumina brevemente un color al presionarlo
  async function flashColor(colorId, ms = 160) {
    activeColor.value = colorId
    await delay(ms)
    activeColor.value = null
  }

  function isActive(colorId) {
    return activeColor.value === colorId
  }

  return { activeColor, isAnimating, playSequence, flashColor, isActive }
}

// ── Helpers de tiempo ────────────────────────────────────────────────────────

export function useTimer() {
  const startTs  = ref(null)
  const elapsedMs = ref(0)
  let _interval = null

  function start() {
    startTs.value = Date.now()
    _interval = setInterval(() => {
      elapsedMs.value = Date.now() - startTs.value
    }, 100)
  }

  function stop() {
    clearInterval(_interval)
    elapsedMs.value = Date.now() - startTs.value
    return elapsedMs.value
  }

  function reset() {
    clearInterval(_interval)
    startTs.value = null
    elapsedMs.value = 0
  }

  const formatted = computed(() => {
    const s = Math.floor(elapsedMs.value / 1000)
    const ms = Math.floor((elapsedMs.value % 1000) / 10)
    return `${s}.${String(ms).padStart(2, '0')}s`
  })

  return { elapsedMs, formatted, start, stop, reset }
}

// ── Formato de tiempo legible ────────────────────────────────────────────────

export function formatMs(ms) {
  if (!ms && ms !== 0) return '—'
  const s = Math.floor(ms / 1000)
  const cents = Math.floor((ms % 1000) / 10)
  if (s < 60) return `${s}.${String(cents).padStart(2, '0')}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// ── Utilidad ─────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
