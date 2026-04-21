<template>
  <div class="lb-page">
    <header class="topbar">
      <button class="icon-btn" @click="router.back()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <div class="topbar-center">
        <span class="game-emoji">{{ meta?.emoji }}</span>
        <div>
          <p class="topbar-title">{{ meta?.name }} — ranking</p>
          <p class="topbar-date">{{ todayLabel }}</p>
        </div>
      </div>
      <button class="icon-btn" @click="router.push('/hub')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      </button>
    </header>

    <!-- Game selector tabs -->
    <div class="tabs">
      <button
        v-for="g in GAMES"
        :key="g.id"
        class="tab"
        :class="{ 'tab-active': gameType === g.id }"
        @click="selectGame(g.id)"
      >
        {{ g.emoji }} {{ g.shortName }}
      </button>
    </div>

    <main class="lb-main">
      <div v-if="loading" class="lb-list lb-skeleton" :style="rowGridStyle" aria-hidden="true">
        <div class="lb-header" :style="rowGridStyle">
          <span class="col-rank">#</span>
          <span class="col-name">jugador</span>
          <span class="col-att">int.</span>
          <span v-if="hasMoves" class="col-num">mov.</span>
          <span v-if="hasScore" class="col-num">pts.</span>
          <span class="col-time">tiempo</span>
        </div>
        <div v-for="n in 8" :key="`sk-row-${n}`" class="lb-row" :style="rowGridStyle">
          <span class="skeleton-block sk-rank"></span>
          <span class="skeleton-block sk-name"></span>
          <span class="skeleton-block sk-num"></span>
          <span v-if="hasMoves" class="skeleton-block sk-num"></span>
          <span v-if="hasScore" class="skeleton-block sk-num"></span>
          <span class="skeleton-block sk-time"></span>
        </div>
      </div>

      <div v-else-if="entries.length === 0" class="center-state">
        <p class="empty-msg">Nadie ha completado este reto todavía.</p>
        <button class="btn-outline" @click="router.push(meta?.route)">Jugar ahora</button>
      </div>

      <div v-else class="lb-list">
        <!-- Column headers -->
        <div class="lb-header" :style="rowGridStyle">
          <span class="col-rank">#</span>
          <span class="col-name">jugador</span>
          <span class="col-att">int.</span>
          <span v-if="hasMoves"  class="col-num">mov.</span>
          <span v-if="hasScore"  class="col-num">pts.</span>
          <span class="col-time">tiempo</span>
        </div>

        <div
          v-for="(entry, i) in entries"
          :key="entry.$id"
          class="lb-row"
          :style="rowGridStyle"
          :class="{ 'row-me': entry.userId === auth.user?.$id, 'row-top': i < 3 }"
        >
          <span class="col-rank">
            <span v-if="i === 0">🥇</span>
            <span v-else-if="i === 1">🥈</span>
            <span v-else-if="i === 2">🥉</span>
            <span v-else class="rank-num">{{ i + 1 }}</span>
          </span>
          <span class="col-name">
            {{ entry.userName }}
            <span v-if="entry.userId === auth.user?.$id" class="you-tag">tú</span>
          </span>
          <span class="col-att">{{ entry.attempts }}</span>
          <span v-if="hasMoves"  class="col-num">{{ entry.moves ?? '—' }}</span>
          <span v-if="hasScore"  class="col-num">{{ entry.score !== null ? entry.score : '—' }}</span>
          <span class="col-time">{{ formatMs(entry.timeMs) }}</span>
        </div>
      </div>

      <!-- My position if not in top 20 -->
      <div v-if="myPosition > 20 && myEntry" class="my-row-banner">
        <span class="my-pos">#{{ myPosition }}</span>
        <span class="my-name">{{ myEntry.userName }}</span>
        <span class="my-time">{{ formatMs(myEntry.timeMs) }}</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { databases, DATABASE_ID, COLLECTION_RESULTS } from '@/appwrite'
import { Query } from 'appwrite'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const entries   = ref([])
const loading   = ref(true)
const myPosition = ref(0)
const myEntry    = ref(null)

const GAMES = [
  { id: 'chromasequence', shortName: 'Chroma', emoji: '🎨', route: '/game' },
  { id: 'numflow',        shortName: 'NumFlow', emoji: '🔢', route: '/numflow' },
  { id: 'pathfinder',     shortName: 'Path',    emoji: '🗺️', route: '/pathfinder' },
  { id: 'buscaminas',     shortName: 'Minas',   emoji: '💣', route: '/buscaminas' },
  { id: 'sunmoon',        shortName: 'Soles',   emoji: '☀️', route: '/sunmoon' }
]

const GAME_META = {
  chromasequence: { name: 'ChromaSequence', emoji: '🎨', iconBg: '#EEEDFE', route: '/game' },
  numflow:        { name: 'NumFlow',        emoji: '🔢', iconBg: '#EEEDFE', route: '/numflow' },
  pathfinder:     { name: 'PathFinder',     emoji: '🗺️', iconBg: '#E6F1FB', route: '/pathfinder' },
  buscaminas:     { name: 'Buscaminas',     emoji: '💣', iconBg: '#F8E4EA', route: '/buscaminas' },
  sunmoon:        { name: 'Soles y Lunas',  emoji: '☀️', iconBg: '#FDEFD5', route: '/sunmoon' }
}

const gameType = ref(route.query.game || 'chromasequence')
const meta     = computed(() => GAME_META[gameType.value])

const hasMoves = computed(() => ['numflow', 'pathfinder', 'buscaminas', 'sunmoon'].includes(gameType.value))
const hasScore = computed(() => gameType.value === 'pathfinder')
const extraCols = computed(() => (hasMoves.value ? 1 : 0) + (hasScore.value ? 1 : 0))
const rowGridStyle = computed(() => ({ '--extra-cols': extraCols.value }))

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
)

function formatMs(ms) {
  if (!ms && ms !== 0) return '—'
  const s = Math.floor(ms / 1000)
  const c = Math.floor((ms % 1000) / 10)
  return s < 60 ? `${s}.${String(c).padStart(2,'0')}s` : `${Math.floor(s/60)}m ${s%60}s`
}

async function load() {
  loading.value = true
  entries.value = []
  myEntry.value = null
  myPosition.value = 0
  const today = new Date().toISOString().slice(0, 10)
  try {
    const allWon = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('date', today),
      Query.equal('gameType', gameType.value),
      Query.equal('won', true),
      Query.orderAsc('moves'),
      Query.orderAsc('timeMs'),
      Query.limit(500)
    ])
    entries.value = allWon.documents.slice(0, 20)

    const myIdx = allWon.documents.findIndex(e => e.userId === auth.user?.$id)
    if (myIdx >= 0) {
      myEntry.value = allWon.documents[myIdx]
      myPosition.value = myIdx + 1
    }
  } finally {
    loading.value = false
  }
}

function selectGame(id) {
  gameType.value = id
  router.replace({ query: { game: id } })
}

watch(gameType, load)
onMounted(load)
</script>

<style scoped>
.lb-page { min-height: 100vh; background: var(--color-background-tertiary); display: flex; flex-direction: column; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1.25rem; background: var(--color-background-primary); border-bottom: 0.5px solid var(--color-border-tertiary); }
.topbar-center { display: flex; align-items: center; gap: 8px; }
.game-emoji { font-size: 20px; }
.topbar-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.topbar-date { font-size: 11px; color: var(--color-text-tertiary); margin: 0; text-transform: capitalize; }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--color-text-secondary); display: flex; padding: 5px; border-radius: 6px; transition: background .15s; }
.icon-btn:hover { background: var(--color-background-secondary); }

.tabs { display: flex; gap: 4px; padding: 8px 12px; background: var(--color-background-primary); border-bottom: 0.5px solid var(--color-border-tertiary); overflow-x: auto; }
.tab { background: transparent; border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 5px 12px; font-size: 12px; cursor: pointer; color: var(--color-text-secondary); white-space: nowrap; transition: background .12s, border-color .12s; }
.tab:hover { background: var(--color-background-secondary); }
.tab-active { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }

.lb-main { flex: 1; padding: 1rem; max-width: 520px; margin: 0 auto; width: 100%; }
.center-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 0; color: var(--color-text-secondary); }
.empty-msg { font-size: 14px; color: var(--color-text-secondary); }
.btn-outline { background: transparent; border: 0.5px solid var(--color-border-secondary); border-radius: 8px; padding: 10px 20px; font-size: 14px; cursor: pointer; color: var(--color-text-primary); }

.lb-list { display: flex; flex-direction: column; gap: 1px; background: var(--color-border-tertiary); border: 0.5px solid var(--color-border-tertiary); border-radius: 12px; overflow: hidden; }
.lb-header, .lb-row { display: grid; grid-template-columns: 36px 1fr 36px repeat(var(--extra-cols, 0), 44px) 68px; align-items: center; padding: 10px 14px; background: var(--color-background-primary); gap: 8px; }
.lb-header { background: var(--color-background-secondary); }
.lb-header span { font-size: 10px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: .05em; font-weight: 500; }
.col-rank { font-size: 16px; text-align: center; }
.rank-num { font-size: 13px; color: var(--color-text-tertiary); font-weight: 500; }
.col-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-att, .col-num { font-size: 13px; color: var(--color-text-secondary); text-align: center; }
.col-time { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; font-variant-numeric: tabular-nums; }
.you-tag { font-size: 10px; background: #E6F1FB; color: #185FA5; border-radius: 4px; padding: 1px 6px; flex-shrink: 0; }
.row-me { background: #F5F4FE; }
.row-me .col-name { color: #3C3489; }

.my-row-banner { margin-top: 8px; background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; }
.my-pos { font-size: 13px; font-weight: 500; color: var(--color-text-tertiary); }
.my-name { flex: 1; font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.my-time { font-size: 13px; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }

.lb-skeleton .lb-row { pointer-events: none; }
.skeleton-block {
  display: block;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #edf2f8 0%, #f8fafd 50%, #edf2f8 100%);
  background-size: 220% 100%;
  animation: shimmer 1.1s linear infinite;
}
.sk-rank { width: 18px; justify-self: center; }
.sk-name { width: 75%; }
.sk-num { width: 24px; justify-self: center; }
.sk-time { width: 54px; justify-self: end; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -20% 0; }
}
</style>
