// src/games/numflow/store.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBaseGameStore } from '@/stores/baseGame'
import { useAuthStore } from '@/stores/auth'

export const useNumFlowStore = defineStore('numflow', () => {
  const auth = useAuthStore()
  const base = createBaseGameStore('numflow')

  // Estado del puzzle: array lineal (0 = hueco)
  const board   = ref([])
  const size    = ref(4)
  const target  = computed(() =>
    Array.from({ length: size.value * size.value }, (_, i) => (i + 1) % (size.value * size.value))
  )
  // target = [1,2,3,...,N,0]

  const isSolved = computed(() =>
    board.value.length > 0 && board.value.every((v, i) => v === target.value[i])
  )

  const blankIdx = computed(() => board.value.indexOf(0))

  // Vecinos válidos del hueco (arriba/abajo/izq/der)
  function neighbors(idx) {
    const row = Math.floor(idx / size.value)
    const col = idx % size.value
    const n = []
    if (row > 0)                 n.push(idx - size.value)
    if (row < size.value - 1)    n.push(idx + size.value)
    if (col > 0)           n.push(idx - 1)
    if (col < size.value - 1)    n.push(idx + 1)
    return n
  }

  function canMove(idx) {
    return neighbors(blankIdx.value).includes(idx)
  }

  function move(idx) {
    if (!canMove(idx) || base.status.value !== 'playing') return
    const b = [...board.value]
    b[blankIdx.value] = b[idx]
    b[idx] = 0
    board.value = b
    base.moves.value++

    if (isSolved.value) {
      base.status.value = 'won'
      base.saveResult(auth.user.$id, auth.user.name, true)
    }
  }

  function giveUp() {
    base.status.value = 'lost'
    base.saveResult(auth.user.$id, auth.user.name, false)
  }

  async function load() {
    const ch = await base.loadChallenge(auth.user.$id)
    // El challenge almacena el estado inicial como array JSON
    const parsedBoard = JSON.parse(ch.payload)
    board.value = parsedBoard
    size.value = Number.isInteger(parsedBoard?.length)
      ? Math.max(3, Math.round(Math.sqrt(parsedBoard.length)))
      : 4
    base.status.value = 'playing'
  }

  return {
    ...base,
    board, size, target, isSolved, blankIdx,
    canMove, move, giveUp, load
  }
})
