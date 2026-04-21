import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createBaseGameStore } from '@/stores/baseGame'
import { useAuthStore } from '@/stores/auth'

function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useMemoryGridStore = defineStore('memorygrid', () => {
  const auth = useAuthStore()
  const base = createBaseGameStore('memorygrid')

  const size = ref(4)
  const cards = ref([])
  const firstPick = ref(null)
  const locked = ref(false)
  const startedAt = ref(null)

  const matchedCount = computed(() => cards.value.filter(c => c.matched).length)
  const totalPairs = computed(() => Math.floor(cards.value.length / 2))
  const matchedPairs = computed(() => Math.floor(matchedCount.value / 2))
  const remainingPairs = computed(() => Math.max(0, totalPairs.value - matchedPairs.value))

  function visible(card) {
    return card.matched || card.revealed
  }

  function reveal(index) {
    if (base.status.value !== 'playing' || locked.value) return

    const card = cards.value[index]
    if (!card || card.matched || card.revealed) return

    if (!startedAt.value) startedAt.value = Date.now()

    card.revealed = true

    if (firstPick.value === null) {
      firstPick.value = index
      return
    }

    const first = cards.value[firstPick.value]
    const second = card
    base.moves.value++

    if (first.value === second.value) {
      first.matched = true
      second.matched = true
      first.revealed = false
      second.revealed = false
      firstPick.value = null

      if (remainingPairs.value === 0) {
        base.status.value = 'won'
        base.attempts.value = Math.min(base.attempts.value + 1, base.maxAttempts.value)
        base.elapsedMs.value = startedAt.value ? Date.now() - startedAt.value : 0
        base.saveResult(auth.user.$id, auth.user.name, true)
      }
      return
    }

    base.attempts.value++
    const reachedLimit = base.attempts.value >= base.maxAttempts.value

    locked.value = true
    const oldFirstIndex = firstPick.value
    firstPick.value = null

    setTimeout(() => {
      const a = cards.value[oldFirstIndex]
      const b = cards.value[index]
      if (a) a.revealed = false
      if (b) b.revealed = false

      if (reachedLimit && base.status.value === 'playing') {
        base.status.value = 'lost'
        base.elapsedMs.value = startedAt.value ? Date.now() - startedAt.value : 0
        base.saveResult(auth.user.$id, auth.user.name, false)
      }

      locked.value = false
    }, 650)
  }

  function resetBoard() {
    cards.value = cards.value.map(card => ({ ...card, revealed: false, matched: false }))
    firstPick.value = null
    locked.value = false
    startedAt.value = null
    base.moves.value = 0
    base.attempts.value = 0
    base.elapsedMs.value = 0
    base.status.value = 'playing'
  }

  async function load() {
    const challenge = await base.loadChallenge(auth.user.$id)
    const payload = JSON.parse(challenge.payload)

    size.value = payload.size ?? 4
    const values = Array.isArray(payload.tiles) ? payload.tiles : []

    cards.value = shuffle(values).map((value, index) => ({
      id: `${index}-${value}`,
      value,
      revealed: false,
      matched: false
    }))

    firstPick.value = null
    locked.value = false
    startedAt.value = null
    base.moves.value = 0
    base.attempts.value = 0
    base.elapsedMs.value = 0
    base.status.value = 'playing'
  }

  return {
    ...base,
    size,
    cards,
    matchedPairs,
    totalPairs,
    remainingPairs,
    locked,
    load,
    reveal,
    visible,
    resetBoard
  }
})
