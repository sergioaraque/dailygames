import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBaseGameStore } from '@/stores/baseGame'
import { useAuthStore } from '@/stores/auth'

export const useSunMoonStore = defineStore('sunmoon', () => {
  const auth = useAuthStore()
  const base = createBaseGameStore('sunmoon')
  base.maxAttempts.value = 1

  const size = ref(4)
  const puzzle = ref([])
  const solution = ref([])
  const board = ref([])

  const totalCells = computed(() => size.value * size.value)
  const filledCount = computed(() => board.value.flat().filter(Boolean).length)
  const isComplete = computed(() => filledCount.value === totalCells.value)

  function getLineStatus(values) {
    const limit = Math.floor(size.value / 2)
    const suns = values.filter(v => v === 'sun').length
    const moons = values.filter(v => v === 'moon').length
    const filled = suns + moons

    const withinLimit = suns <= limit && moons <= limit
    const balancedWhenFull = filled < size.value || (suns === limit && moons === limit)
    const valid = withinLimit && balancedWhenFull

    return { valid, suns, moons, filled, limit }
  }

  const rowStatus = computed(() =>
    board.value.map(row => getLineStatus(row))
  )

  const colStatus = computed(() => {
    const cols = []
    for (let c = 0; c < size.value; c++) {
      const values = []
      for (let r = 0; r < size.value; r++) {
        values.push(board.value?.[r]?.[c] ?? null)
      }
      cols.push(getLineStatus(values))
    }
    return cols
  })

  function isFixed(r, c) {
    return puzzle.value?.[r]?.[c] !== null
  }

  function cell(r, c) {
    return board.value?.[r]?.[c] ?? null
  }

  function cycleCell(r, c) {
    if (base.status.value !== 'playing') return
    if (isFixed(r, c)) return

    const current = cell(r, c)
    const next = current === null ? 'sun' : current === 'sun' ? 'moon' : null
    board.value[r][c] = next
    board.value = board.value.map(row => [...row])
    base.moves.value++

    if (isComplete.value) {
      const won = board.value.every((row, rr) =>
        row.every((v, cc) => v === solution.value[rr][cc])
      )
      base.status.value = won ? 'won' : 'lost'
      base.saveResult(auth.user.$id, auth.user.name, won)
    }
  }

  function resetBoard() {
    board.value = puzzle.value.map(row => [...row])
    base.moves.value = 0
    base.elapsedMs.value = 0
    base.status.value = 'playing'
  }

  function giveUp() {
    if (base.status.value !== 'playing') return
    base.status.value = 'lost'
    base.saveResult(auth.user.$id, auth.user.name, false)
  }

  async function load() {
    const ch = await base.loadChallenge(auth.user.$id)
    const payload = JSON.parse(ch.payload)

    size.value = payload.size ?? 4
    puzzle.value = payload.puzzle ?? []
    solution.value = payload.solution ?? []
    resetBoard()
  }

  return {
    ...base,
    size,
    puzzle,
    solution,
    board,
    totalCells,
    filledCount,
    isComplete,
    rowStatus,
    colStatus,
    isFixed,
    cell,
    cycleCell,
    resetBoard,
    giveUp,
    load
  }
})
