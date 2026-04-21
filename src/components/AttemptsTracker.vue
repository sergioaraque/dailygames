<template>
  <div class="attempts-wrap">
    <div
      v-for="n in max"
      :key="n"
      class="attempt-icon"
      :class="n > remaining ? 'used' : 'alive'"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </div>
    <span class="attempts-label">{{ remaining > 0 ? `${remaining} intento${remaining !== 1 ? 's' : ''}` : 'Sin intentos' }}</span>
  </div>
</template>

<script setup>
defineProps({
  remaining: { type: Number, required: true },
  max:       { type: Number, default: 3 }
})
</script>

<style scoped>
.attempts-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.attempt-icon {
  transition: color 0.25s ease, transform 0.25s ease;
}
.attempt-icon.alive {
  color: #E24B4A;
}
.attempt-icon.used {
  color: var(--color-border-secondary);
  transform: scale(0.8);
}
.attempts-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-left: 2px;
}
</style>
