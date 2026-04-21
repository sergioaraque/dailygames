<template>
  <div class="hub-page">
    <header class="topbar">
      <div class="brand">
        <div class="brand-dots">
          <span class="dot" style="background:#E24B4A"/>
          <span class="dot" style="background:#378ADD"/>
          <span class="dot" style="background:#639922"/>
          <span class="dot" style="background:#EF9F27"/>
        </div>
        <span class="brand-name">DailyGames</span>
      </div>
      <div class="topbar-right">
        <span class="user-name">{{ auth.user?.name?.split(' ')[0] }}</span>
        <button class="icon-btn" @click="handleLogout" title="Cerrar sesión">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </header>

    <main class="hub-main">
      <p class="day-label">{{ todayLabel }}</p>
      <h1 class="hub-title">Retos de hoy</h1>
      <p class="hub-subtitle">Completa todos los retos para mantener la racha y mejorar tu puesto en el ranking.</p>

      <section class="progress-wrap">
        <div class="progress-head">
          <span>Progreso diario</span>
          <strong>{{ completedToday.size }}/{{ totalGames }}</strong>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="completedToday.size" aria-valuemin="0" :aria-valuemax="totalGames">
          <div class="progress-fill" :style="{ width: `${(completedToday.size / totalGames) * 100}%` }"></div>
        </div>
      </section>

      <div v-if="loadingHub" class="games-grid">
        <article v-for="n in totalGames" :key="`sk-${n}`" class="game-card skeleton-card" aria-hidden="true">
          <div class="card-icon skeleton-block"></div>
          <div class="card-body">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-short"></div>
          </div>
        </article>
      </div>

      <div v-else class="games-grid">
        <RouterLink
          v-for="game in GAMES"
          :key="game.id"
          :to="game.route"
          class="game-card"
          :class="{ 'card-completed': completedToday.has(game.id) }"
        >
          <div class="card-icon" :style="{ background: game.iconBg }">
            <span style="font-size:22px;">{{ game.emoji }}</span>
          </div>
          <div class="card-body">
            <div class="card-header">
              <p class="card-name">{{ game.name }}</p>
              <span v-if="completedToday.has(game.id)" class="badge-done">
                {{ completedWon.has(game.id) ? '✓ Ganado' : 'Jugado' }}
              </span>
            </div>
            <p class="card-desc">{{ game.desc }}</p>
            <div class="card-tags">
              <span class="tag" v-for="tag in game.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="card-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </RouterLink>
      </div>

      <!-- Racha global -->
      <div class="streak-banner" v-if="globalStreak > 0">
        <span class="streak-fire">🔥</span>
        <span class="streak-text">Racha de <strong>{{ globalStreak }}</strong> día{{ globalStreak !== 1 ? 's' : '' }} completando al menos un reto</span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { databases, DATABASE_ID, COLLECTION_RESULTS, COLLECTION_STATS } from '@/appwrite'
import { Query } from 'appwrite'

const router = useRouter()
const auth   = useAuthStore()
const completedToday = ref(new Set())
const completedWon   = ref(new Set())
const globalStreak   = ref(0)
const loadingHub     = ref(true)

const GAMES = [
  { id: 'chromasequence', name: 'ChromaSequence', emoji: '🎨', iconBg: '#EEEDFE', route: '/game', desc: 'Memoriza y reproduce la secuencia de colores.', tags: ['memoria', 'patrones'] },
  { id: 'numflow',        name: 'NumFlow',        emoji: '🔢', iconBg: '#EEEDFE', route: '/numflow', desc: 'Ordena los números moviendo una pieza a la vez.', tags: ['lógica', 'deslizamiento'] },
  { id: 'pathfinder',     name: 'PathFinder',     emoji: '🗺️', iconBg: '#E6F1FB', route: '/pathfinder', desc: 'Traza el camino óptimo siguiendo las reglas del tablero.', tags: ['ruta', 'estrategia'] },
  { id: 'buscaminas',     name: 'Buscaminas',     emoji: '💣', iconBg: '#F8E4EA', route: '/buscaminas', desc: 'Despeja casillas sin tocar minas y marca minas con banderas.', tags: ['casual', 'deducción'] },
  { id: 'sunmoon',        name: 'Soles y Lunas',  emoji: '☀️', iconBg: '#FDEFD5', route: '/sunmoon', desc: 'Completa el tablero equilibrando soles y lunas por fila y columna.', tags: ['lógica', 'patrones'] },
  { id: 'memorygrid',     name: 'MemoryGrid',     emoji: '🧠', iconBg: '#E7F6F0', route: '/memorygrid', desc: 'Descubre todas las parejas antes de agotar los fallos.', tags: ['memoria', 'parejas'] }
]

const totalGames = computed(() => GAMES.length)

const todayLabel = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
)

onMounted(async () => {
  if (!auth.user) {
    loadingHub.value = false
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_RESULTS, [
      Query.equal('userId', auth.user.$id),
      Query.equal('date', today),
      Query.limit(10)
    ])
    res.documents.forEach(doc => {
      completedToday.value.add(doc.gameType)
      if (doc.won) completedWon.value.add(doc.gameType)
    })
  } catch { /**/ }

  // Racha global: días con al menos 1 juego completado
  try {
    const statsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_STATS, [
      Query.equal('userId', auth.user.$id),
      Query.orderDesc('streak'),
      Query.limit(1)
    ])
    globalStreak.value = statsRes.documents[0]?.streak ?? 0
  } catch { /**/ }

  loadingHub.value = false
})

async function handleLogout() {
  await auth.logout()
  router.push('/')
}
</script>

<style scoped>
.hub-page { min-height: 100vh; background: var(--color-background-tertiary); }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.9rem 1.25rem;
  background: var(--color-background-primary);
  border-bottom: 0.5px solid var(--color-border-tertiary);
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-dots { display: flex; gap: 4px; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.brand-name { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 13px; color: var(--color-text-secondary); }
.icon-btn { background: transparent; border: none; cursor: pointer; color: var(--color-text-secondary); display: flex; padding: 5px; border-radius: 6px; transition: background .15s; }
.icon-btn:hover { background: var(--color-background-secondary); }

.hub-main { max-width: 480px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.day-label { font-size: 12px; color: var(--color-text-tertiary); text-transform: capitalize; margin-bottom: 2px; }
.hub-title { font-size: 24px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 0.2rem; }
.hub-subtitle { font-size: 13px; color: var(--color-text-secondary); line-height: 1.45; margin-bottom: 1rem; }

.progress-wrap {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--color-border-tertiary);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 1rem;
  backdrop-filter: blur(2px);
}
.progress-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 7px; }
.progress-head strong { color: var(--color-text-primary); font-size: 13px; }
.progress-track { height: 8px; border-radius: 999px; background: #d9e2ef; overflow: hidden; }
.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2e78c9 0%, #57a271 100%);
  transition: width .22s ease;
}

.games-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.5rem; }
.game-card {
  display: flex; align-items: center; gap: 14px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-lg);
  padding: 14px 12px 14px 14px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 6px 16px rgba(26, 41, 67, 0.05);
  transition: border-color .15s, background .15s, transform .15s, box-shadow .15s;
}
.game-card:hover {
  border-color: #8ea8c9;
  background: #f8fbff;
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(24, 43, 70, 0.1);
}
.card-completed { border-color: var(--color-border-success); }
.card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-body { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.card-header { display: flex; align-items: center; gap: 8px; }
.card-name { font-size: 15px; font-weight: 500; color: var(--color-text-primary); margin: 0; }
.badge-done { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: #EAF3DE; color: #3B6D11; font-weight: 500; }
.card-desc { font-size: 12px; color: var(--color-text-secondary); margin: 0; line-height: 1.4; }
.card-tags { display: flex; gap: 5px; flex-wrap: wrap; }
.tag { font-size: 10px; padding: 2px 7px; border-radius: 20px; background: var(--color-background-secondary); color: var(--color-text-tertiary); border: 0.5px solid var(--color-border-tertiary); }
.card-arrow { color: var(--color-text-tertiary); flex-shrink: 0; }

.skeleton-card { pointer-events: none; }
.skeleton-block,
.skeleton-line {
  background: linear-gradient(90deg, #edf2f8 0%, #f7f9fc 50%, #edf2f8 100%);
  background-size: 220% 100%;
  animation: shimmer 1.1s linear infinite;
}
.skeleton-line { height: 11px; border-radius: 6px; width: 100%; }
.skeleton-title { height: 14px; width: 55%; }
.skeleton-short { width: 70%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -20% 0; }
}

.streak-banner {
  display: flex; align-items: center; gap: 10px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px;
  padding: 12px 16px;
}
.streak-fire { font-size: 20px; }
.streak-text { font-size: 13px; color: var(--color-text-secondary); }
.streak-text strong { color: var(--color-text-primary); }

@media (max-width: 480px) {
  .hub-main { padding-top: 1.25rem; }
  .hub-title { font-size: 22px; }
  .game-card { gap: 11px; }
}
</style>
