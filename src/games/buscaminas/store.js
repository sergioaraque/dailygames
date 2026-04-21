import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBaseGameStore } from '@/stores/baseGame'
import { useAuthStore } from '@/stores/auth'

export const useBuscaminasStore = defineStore('buscaminas', () => {
  const auth = useAuthStore()
  const base = createBaseGameStore('buscaminas')
  base.maxAttempts.value = 1

  const size = ref(6)
  const mineCount = ref(6)
  const mines = ref(new Set())
  const revealed = ref(new Set())
  const flagged = ref(new Set())
  const touched = ref(new Set())
  const explodedCell = ref(null)

  const startedAt = ref(null)

  const totalCells = computed(() => size.value * size.value)
  const safeCells = computed(() => totalCells.value - mineCount.value)
  const revealedSafeCount = computed(() => {
    let n = 0
    for (const i of revealed.value) {
      if (!mines.value.has(i)) n++
    }
    return n
  })

  function idx(r, c) {
    return r * size.value + c
  }

  function inside(r, c) {
    return r >= 0 && r < size.value && c >= 0 && c < size.value
  }

  function neighbors(i) {
    const r = Math.floor(i / size.value)
    const c = i % size.value
    const list = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr
        const nc = c + dc
        if (inside(nr, nc)) list.push(idx(nr, nc))
      }
    }
    return list
  }

  function adjacentMines(i) {
    return neighbors(i).filter(n => mines.value.has(n)).length
  }

  function isRevealed(r, c) {
    return revealed.value.has(idx(r, c))
  }

  function isFlagged(r, c) {
    return flagged.value.has(idx(r, c))
  }

  function isMine(r, c) {
    return mines.value.has(idx(r, c))
  }

  function cellNumber(r, c) {
    return adjacentMines(idx(r, c))
  }

  function revealCell(startIdx) {
    const queue = [startIdx]
    while (queue.length) {
      const i = queue.shift()
      if (revealed.value.has(i) || flagged.value.has(i) || mines.value.has(i)) continue

      revealed.value.add(i)
      if (adjacentMines(i) !== 0) continue

      for (const n of neighbors(i)) {
        if (!revealed.value.has(n) && !flagged.value.has(n) && !mines.value.has(n)) {
          queue.push(n)
        }
      }
    }
  }

  function markElapsedAndSave(won) {
    if (startedAt.value) {
      base.elapsedMs.value = Date.now() - startedAt.value
    }
    base.attempts.value = 1
    base.saveResult(auth.user.$id, auth.user.name, won)
  }

  function ensureStarted() {
    if (!startedAt.value) startedAt.value = Date.now()
  }

  function reveal(r, c) {
    if (base.status.value !== 'playing') return

    const i = idx(r, c)
    if (revealed.value.has(i) || flagged.value.has(i)) return

    ensureStarted()
    touched.value.add(i)
    touched.value = new Set(touched.value)
    base.moves.value++

    if (mines.value.has(i)) {
      explodedCell.value = i
      revealed.value.add(i)
      base.status.value = 'lost'
      markElapsedAndSave(false)
      return
    }

    revealCell(i)
    revealed.value = new Set(revealed.value)

    if (revealedSafeCount.value >= safeCells.value) {
      base.status.value = 'won'
      markElapsedAndSave(true)
    }
  }

  function toggleFlag(r, c) {
    if (base.status.value !== 'playing') return
    const i = idx(r, c)
    if (revealed.value.has(i)) return

    ensureStarted()
    touched.value.add(i)
    if (flagged.value.has(i)) flagged.value.delete(i)
    else flagged.value.add(i)

    touched.value = new Set(touched.value)
    flagged.value = new Set(flagged.value)
  }

  function resetBoard() {
    revealed.value = new Set()
    flagged.value = new Set()
    touched.value = new Set()
    explodedCell.value = null
    startedAt.value = null
    base.moves.value = 0
    base.elapsedMs.value = 0
    base.status.value = 'playing'
  }

  async function load() {
    const ch = await base.loadChallenge(auth.user.$id)
    const payload = JSON.parse(ch.payload)

    size.value = payload.size ?? 6
    mineCount.value = payload.mineCount ?? 6
    mines.value = new Set(payload.mines ?? [])

    resetBoard()
  }

  const flagsLeft = computed(() => Math.max(0, mineCount.value - flagged.value.size))

  return {
    ...base,
    size,
    mineCount,
    mines,
    revealed,
    flagged,
    touched,
    explodedCell,
    totalCells,
    safeCells,
    revealedSafeCount,
    flagsLeft,
    load,
    resetBoard,
    reveal,
    toggleFlag,
    isRevealed,
    isFlagged,
    isMine,
    cellNumber
  }
})
