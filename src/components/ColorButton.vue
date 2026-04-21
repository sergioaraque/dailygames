<template>
  <button
    class="color-btn"
    :class="{
      'is-active':   active,
      'is-error':    errorFlash,
      'is-disabled': disabled
    }"
    :style="{ '--clr': color.hex }"
    :disabled="disabled"
    :aria-label="`Color ${color.id}`"
    @click="handleClick"
  >
    <div class="color-face">
      <div class="color-shine" />
    </div>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  color:    { type: Object,  required: true },  // { id, hex }
  active:   { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['press'])
const errorFlash = ref(false)

function handleClick() {
  if (props.disabled) return
  emit('press', props.color.id)
}

// Llamado externamente desde el padre para mostrar error
function triggerError() {
  errorFlash.value = true
  setTimeout(() => { errorFlash.value = false }, 400)
}

defineExpose({ triggerError })
</script>

<style scoped>
.color-btn {
  position: relative;
  aspect-ratio: 1;
  border-radius: 18px;
  border: 2.5px solid transparent;
  background: var(--color-background-secondary);
  cursor: pointer;
  padding: 10px;
  transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.color-btn:not(.is-disabled):hover {
  transform: scale(1.03);
  border-color: var(--clr);
}

.color-face {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 11px;
  background: var(--clr);
  position: relative;
  overflow: hidden;
  transition: filter 0.12s ease;
}

.color-shine {
  position: absolute;
  top: 6%;
  left: 10%;
  width: 40%;
  height: 25%;
  border-radius: 50%;
  background: rgba(255,255,255,0.28);
  filter: blur(3px);
}

/* Active (iluminado por secuencia o pulsado) */
.color-btn.is-active {
  transform: scale(0.91);
  border-color: var(--clr);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--clr) 30%, transparent);
}
.color-btn.is-active .color-face {
  filter: brightness(1.35);
}

/* Error flash */
.color-btn.is-error {
  animation: shake 0.35s ease;
  border-color: #E24B4A;
  box-shadow: 0 0 0 4px rgba(226, 75, 74, 0.25);
}
.color-btn.is-error .color-face {
  filter: brightness(0.7) saturate(0.5);
}

/* Disabled (modo espera / watching) */
.color-btn.is-disabled {
  opacity: 0.38;
  cursor: default;
  pointer-events: none;
}

@keyframes shake {
  0%  { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
  100%{ transform: translateX(0); }
}
</style>
