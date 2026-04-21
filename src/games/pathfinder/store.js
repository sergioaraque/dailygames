// src/games/pathfinder/store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBaseGameStore } from '@/stores/baseGame'
import { useAuthStore } from '@/stores/auth'

export const usePathFinderStore = defineStore('pathfinder', () => {
  const auth = useAuthStore()
  const base = createBaseGameStore('pathfinder')

  // Colores de celdas y sus reglas
  const COLORS = {
    white:  { label: 'blanco', rule: 'Casilla normal' },
    blue:   { label: 'azul',    rule: '+1 bonus' },
    green:  { label: 'verde',   rule: 'Meta' }
  }

  // payload = { grid: string[][], start: [r,c], end: [r,c], rules: {...}, minScore: number }
  const grid    = ref([])       // 5x5 array de color strings
  const start   = ref([0,0])
  const end     = ref([4,4])
  const rules   = ref({})

  const path    = ref([])       // [[r,c], ...] camino actual del jugador
  const score   = ref(0)

  const gridSize = computed(() => grid.value?.length || 5)

  const currentPos = computed(() => path.value.length ? path.value[path.value.length - 1] : null)
  const isAtEnd    = computed(() => {
    const p = currentPos.value
    return p && p[0] === end.value[0] && p[1] === end.value[1]
  })

  function isInPath(r, c) {
    return path.value.some(([pr, pc]) => pr === r && pc === c)
  }

  function canStep(r, c) {
    if (base.status.value !== 'playing') return false
    if (r < 0 || r >= gridSize.value || c < 0 || c >= gridSize.value) return false
    if (isInPath(r, c)) return false
    const cur = currentPos.value
    if (!cur) return false
    // Solo adyacente (no diagonal)
    const dr = Math.abs(r - cur[0]), dc = Math.abs(c - cur[1])
    return (dr + dc === 1)
  }

  function step(r, c) {
    if (!canStep(r, c)) return
    const color = grid.value[r][c]

    path.value = [...path.value, [r, c]]
    base.moves.value++

    // Calcular puntuación
    if (color === 'blue') score.value += 1

    // Llegó al final
    if (isAtEnd.value) {
      base.status.value = 'won'
      base.saveResult(auth.user.$id, auth.user.name, true, { score: score.value })
    }
  }

  function reset() {
    if (!base.challenge.value) return
    const p = JSON.parse(base.challenge.value.payload)
    path.value  = [[p.start[0], p.start[1]]]
    score.value = 0
    base.moves.value = 0
  }

  async function load() {
    const ch = await base.loadChallenge(auth.user.$id)
    const p  = JSON.parse(ch.payload)
    grid.value     = p.grid
    start.value    = p.start
    end.value      = p.end
    rules.value    = p.rules ?? {}
    path.value     = [[p.start[0], p.start[1]]]
    score.value    = 0
    base.status.value = 'playing'
  }

  return {
    ...base,
    COLORS, grid, start, end, rules,
    path, score, gridSize, currentPos, isAtEnd,
    isInPath, canStep, step, reset, load
  }
})
