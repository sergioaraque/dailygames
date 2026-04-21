<template>
  <div class="landing-page">
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="glow glow-left" aria-hidden="true"></div>
    <div class="glow glow-right" aria-hidden="true"></div>

    <header class="site-header">
      <div class="brand">
        <div class="brand-dots">
          <span class="dot" style="background:#E24B4A"></span>
          <span class="dot" style="background:#378ADD"></span>
          <span class="dot" style="background:#639922"></span>
          <span class="dot" style="background:#EF9F27"></span>
        </div>
        <span class="brand-name">DailyGames</span>
      </div>
      <RouterLink class="header-link" :to="auth.user ? '/hub' : '/login'">
        {{ auth.user ? 'Ir al hub' : 'Iniciar sesion' }}
      </RouterLink>
    </header>

    <main class="hero-wrap">
      <section class="hero">
        <p class="eyebrow">Retos diarios de logica y memoria</p>
        <h1>Un proyecto para jugar cada dia con el mismo reto para todos.</h1>
        <p class="lead">
          DailyGames es una app web con minijuegos rapidos estilo daily challenge.
          Cada jornada se genera un reto por juego, guardas tu resultado y compites en ranking.
        </p>

        <div class="cta-row">
          <RouterLink class="btn btn-primary" :to="auth.user ? '/hub' : '/login'">
            {{ auth.user ? 'Abrir retos de hoy' : 'Crear cuenta gratis' }}
          </RouterLink>
          <a class="btn btn-ghost" href="#como-funciona">Como funciona</a>
        </div>

        <ul class="highlights">
          <li>Mismo reto diario para toda la comunidad</li>
          <li>Rachas y progreso guardados en tu cuenta</li>
          <li>Resultados compartibles en segundos</li>
        </ul>
      </section>

      <aside class="showcase">
        <p class="showcase-title">Juegos actuales</p>
        <div class="game-list">
          <article v-for="game in games" :key="game.name" class="game-item">
            <div class="icon" :style="{ background: game.bg }">{{ game.emoji }}</div>
            <div>
              <p class="game-name">{{ game.name }}</p>
              <p class="game-desc">{{ game.desc }}</p>
            </div>
          </article>
        </div>
      </aside>
    </main>

    <section id="como-funciona" class="steps">
      <article>
        <span>01</span>
        <h2>Entras y juegas</h2>
        <p>Inicias sesion y accedes al hub con todos los retos del dia.</p>
      </article>
      <article>
        <span>02</span>
        <h2>Guardas resultado</h2>
        <p>La app registra intentos, tiempo y estadisticas por juego.</p>
      </article>
      <article>
        <span>03</span>
        <h2>Compites en ranking</h2>
        <p>Comparas tu posicion frente al resto y mantienes tu racha.</p>
      </article>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const games = [
  { name: 'ChromaSequence', emoji: '🎨', bg: '#eeedfe', desc: 'Memoriza y repite la secuencia correcta.' },
  { name: 'NumFlow', emoji: '🔢', bg: '#e7f1ff', desc: 'Ordena fichas moviendo una casilla vacia.' },
  { name: 'PathFinder', emoji: '🗺️', bg: '#e4f8ef', desc: 'Encuentra el camino optimo con restricciones.' },
  { name: 'Buscaminas', emoji: '💣', bg: '#fce8ed', desc: 'Descubre casillas seguras sin tocar minas.' }
]

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');

.landing-page {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  padding: 1.25rem 1rem 3rem;
  font-family: 'Sora', 'Space Grotesk', 'Segoe UI', sans-serif;
  color: #1b2440;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(66, 96, 146, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(66, 96, 146, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black 45%, transparent 88%);
  z-index: 0;
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(20px);
  pointer-events: none;
  z-index: 0;
}
.glow-left {
  width: 340px;
  height: 340px;
  top: -120px;
  left: -90px;
  background: radial-gradient(circle, rgba(54, 122, 203, 0.25) 0%, rgba(54, 122, 203, 0) 70%);
}
.glow-right {
  width: 360px;
  height: 360px;
  right: -120px;
  bottom: -160px;
  background: radial-gradient(circle, rgba(229, 150, 53, 0.26) 0%, rgba(229, 150, 53, 0) 72%);
}

.site-header,
.hero-wrap,
.steps {
  position: relative;
  z-index: 1;
}

.site-header {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-dots {
  display: flex;
  gap: 5px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
}

.header-link {
  text-decoration: none;
  font-size: 13px;
  color: #204f86;
  font-weight: 700;
  border: 1px solid #8eabd0;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
}

.hero-wrap {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 1.25rem;
  align-items: stretch;
}

.hero,
.showcase,
.steps article {
  border: 1px solid rgba(135, 159, 191, 0.48);
  border-radius: 22px;
  background: rgba(252, 254, 255, 0.84);
  backdrop-filter: blur(4px);
  box-shadow: 0 18px 32px rgba(26, 47, 81, 0.08);
}

.hero {
  padding: 1.8rem;
  animation: rise .6s ease-out both;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #2e6fb1;
  margin-bottom: .65rem;
}

h1 {
  font-size: clamp(1.9rem, 3.4vw, 3rem);
  line-height: 1.08;
  margin: 0 0 .9rem;
}

.lead {
  font-size: 15px;
  line-height: 1.7;
  color: #384764;
  max-width: 58ch;
}

.cta-row {
  margin-top: 1.15rem;
  display: flex;
  gap: .7rem;
  flex-wrap: wrap;
}

.btn {
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  border-radius: 999px;
  padding: 11px 16px;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(90deg, #2e78c9, #2c9168);
}

.btn-ghost {
  color: #1e365a;
  border: 1px solid #9fb5d3;
  background: rgba(255, 255, 255, 0.78);
}

.highlights {
  margin: 1rem 0 0;
  list-style: none;
  display: grid;
  gap: .45rem;
  color: #435571;
  font-size: 14px;
}

.highlights li::before {
  content: '• ';
  color: #2f79ca;
}

.showcase {
  padding: 1.25rem;
  animation: rise .7s .12s ease-out both;
}

.showcase-title {
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #5a6f92;
  margin: 0 0 .6rem;
}

.game-list {
  display: grid;
  gap: .55rem;
}

.game-item {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: .6rem;
  align-items: start;
  padding: .65rem;
  border-radius: 12px;
  background: rgba(239, 245, 255, 0.7);
}

.icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.game-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.game-desc {
  margin: .16rem 0 0;
  font-size: 12px;
  color: #566888;
  line-height: 1.45;
}

.steps {
  max-width: 1100px;
  margin: 1.2rem auto 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
}

.steps article {
  padding: 1rem;
  animation: rise .8s .2s ease-out both;
}

.steps span {
  display: inline-block;
  font-size: 11px;
  letter-spacing: .08em;
  color: #2e6fb1;
  font-weight: 700;
}

.steps h2 {
  margin: .3rem 0;
  font-size: 18px;
}

.steps p {
  margin: 0;
  color: #4f607e;
  font-size: 13px;
  line-height: 1.6;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .hero-wrap {
    grid-template-columns: 1fr;
  }

  .steps {
    grid-template-columns: 1fr;
  }

  .hero {
    padding: 1.4rem;
  }
}
</style>
