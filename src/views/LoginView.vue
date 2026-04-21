<template>
  <div class="login-page">
    <div class="bg-orb orb-a"></div>
    <div class="bg-orb orb-b"></div>

    <div class="card">
      <div class="logo">
        <span class="dot" v-for="c in dotColors" :key="c" :style="{ background: c }" />
      </div>
      <h1>DailyGames</h1>
      <p class="subtitle">Cinco retos nuevos cada día. Un minuto, toda la diversión.</p>
      <p class="helper">Inicia sesión para guardar progreso, racha y resultados del día.</p>

      <div v-if="!showRegister" class="form-section">
        <p class="form-title">Entrar</p>
        <input v-model="email"    type="email"    placeholder="Correo electrónico" />
        <input v-model="password" type="password" placeholder="Contraseña" @keyup.enter="handleLogin" />
        <button class="btn-primary" @click="handleLogin" :disabled="auth.loading">
          {{ auth.loading ? 'Entrando...' : 'Entrar' }}
        </button>
        <p class="error" v-if="error">{{ error }}</p>
        <p class="toggle">¿Sin cuenta? <a @click="showRegister = true">Regístrate gratis</a></p>
      </div>

      <div v-else class="form-section">
        <p class="form-title">Crear cuenta</p>
        <input v-model="name"     type="text"     placeholder="Nombre" />
        <input v-model="email"    type="email"    placeholder="Correo electrónico" />
        <input v-model="password" type="password" placeholder="Contraseña (mín. 8 caracteres)" @keyup.enter="handleRegister" />
        <button class="btn-primary" @click="handleRegister" :disabled="auth.loading">
          {{ auth.loading ? 'Creando cuenta...' : 'Crear cuenta' }}
        </button>
        <p class="error" v-if="error">{{ error }}</p>
        <p class="toggle">¿Ya tienes cuenta? <a @click="showRegister = false">Inicia sesión</a></p>
      </div>

      <div class="game-pills">
        <span v-for="g in games" :key="g" class="game-pill">{{ g }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth        = useAuthStore()
const router      = useRouter()
const email       = ref('')
const password    = ref('')
const name        = ref('')
const error       = ref('')
const showRegister = ref(false)

const dotColors = ['#E24B4A', '#378ADD', '#639922', '#EF9F27', '#7F77DD', '#1D9E75']
const games     = ['ChromaSequence', 'NumFlow', 'PathFinder', 'Buscaminas']

async function handleLogin() {
  error.value = ''
  try {
    await auth.loginWithEmail(email.value, password.value)
    router.push('/hub')
  } catch {
    error.value = 'Credenciales incorrectas. Inténtalo de nuevo.'
  }
}

async function handleRegister() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  try {
    await auth.registerWithEmail(name.value, email.value, password.value)
    router.push('/hub')
  } catch (e) {
    error.value = e.message || 'Error al crear la cuenta.'
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background-tertiary);
  padding: 1rem;
}
.bg-orb {
  position: absolute;
  filter: blur(2px);
  border-radius: 999px;
  z-index: 0;
}
.orb-a {
  width: 260px;
  height: 260px;
  background: radial-gradient(circle at 35% 35%, rgba(54, 122, 203, 0.34) 0, rgba(54, 122, 203, 0) 74%);
  top: -60px;
  left: -50px;
}
.orb-b {
  width: 290px;
  height: 290px;
  background: radial-gradient(circle at 50% 50%, rgba(211, 155, 55, 0.34) 0, rgba(211, 155, 55, 0) 76%);
  right: -85px;
  bottom: -100px;
}
.card {
  position: relative;
  z-index: 1;
  background: var(--color-background-primary);
  border: 1px solid var(--color-border-tertiary);
  box-shadow: 0 18px 34px rgba(24, 41, 67, 0.16);
  border-radius: 18px;
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 410px;
  text-align: center;
}
.logo { display: flex; gap: 6px; justify-content: center; margin-bottom: 1rem; }
.dot { width: 13px; height: 13px; border-radius: 50%; display: inline-block; }
h1 { font-size: 26px; letter-spacing: -0.01em; font-weight: 700; margin: 0 0 0.2rem; color: var(--color-text-primary); }
.subtitle { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 0.55rem; line-height: 1.5; }
.helper {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 1.3rem;
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border-tertiary);
  border-radius: 10px;
  padding: 9px 10px;
}
.form-title {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.form-section { display: flex; flex-direction: column; gap: 10px; }
input { width: 100%; box-sizing: border-box; }
.btn-primary {
  background: var(--color-text-primary);
  color: var(--color-background-primary);
  border: none; padding: 12px; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;
}
.btn-primary:disabled { opacity: .5; cursor: default; }
.toggle { font-size: 13px; color: var(--color-text-secondary); margin-top: 2px; }
.toggle a { color: var(--color-text-info); cursor: pointer; font-weight: 600; }
.error { color: var(--color-text-danger); font-size: 13px; }
.game-pills { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 0.5px solid var(--color-border-tertiary); }
.game-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: var(--color-background-secondary); color: var(--color-text-tertiary); border: 0.5px solid var(--color-border-tertiary); }

@media (max-width: 460px) {
  .card { padding: 2rem 1.1rem; }
  h1 { font-size: 23px; }
}
</style>
