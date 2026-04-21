import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/',            component: () => import('@/views/LandingView.vue'),             name: 'landing' },
  { path: '/login',       component: () => import('@/views/LoginView.vue'),               name: 'login' },
  { path: '/hub',         component: () => import('@/views/HomeView.vue'),                name: 'hub',         meta: { requiresAuth: true } },
  { path: '/game',        component: () => import('@/views/GameView.vue'),                name: 'chromasequence', meta: { requiresAuth: true } },
  { path: '/numflow',     component: () => import('@/games/numflow/NumFlow.vue'),         name: 'numflow',     meta: { requiresAuth: true } },
  { path: '/pathfinder',  component: () => import('@/games/pathfinder/PathFinder.vue'),   name: 'pathfinder',  meta: { requiresAuth: true } },
  { path: '/buscaminas',  component: () => import('@/games/buscaminas/Buscaminas.vue'),   name: 'buscaminas',  meta: { requiresAuth: true } },
  { path: '/sunmoon',     component: () => import('@/games/sunmoon/SunMoon.vue'),         name: 'sunmoon',     meta: { requiresAuth: true } },
  { path: '/result',      component: () => import('@/views/ResultView.vue'),              name: 'result',      meta: { requiresAuth: true } },
  { path: '/leaderboard', component: () => import('@/views/LeaderboardView.vue'),         name: 'leaderboard', meta: { requiresAuth: true } }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.user) await auth.fetchUser()
  if (to.name === 'login' && auth.user) return { name: 'hub' }
  if (!to.meta.requiresAuth) return true
  if (!auth.user) return { name: 'login' }
  return true
})

export default router
