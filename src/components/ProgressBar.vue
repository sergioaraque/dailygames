<template>
  <div class="progress-wrap" role="progressbar" :aria-valuenow="filled" :aria-valuemax="total">
    <div
      v-for="(colorId, i) in sequence"
      :key="i"
      class="progress-dot"
      :class="{
        'filled':   i < filled,
        'current':  i === filled && inputMode,
        'pending':  i >= filled
      }"
      :style="dotStyle(colorId, i)"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  sequence:  { type: Array,   required: true },   // array de colorIds
  filled:    { type: Number,  default: 0 },        // cuántos ya completados
  colors:    { type: Array,   required: true },    // [{ id, hex }]
  inputMode: { type: Boolean, default: false }
})

function getHex(colorId) {
  return props.colors.find(c => c.id === colorId)?.hex ?? '#ccc'
}

function dotStyle(colorId, index) {
  const hex = getHex(colorId)
  if (index < props.filled) {
    return { background: hex, borderColor: hex }
  }
  if (index === props.filled && props.inputMode) {
    return { background: 'transparent', borderColor: hex, boxShadow: `0 0 0 3px color-mix(in srgb, ${hex} 25%, transparent)` }
  }
  return { background: 'transparent', borderColor: 'var(--color-border-secondary)' }
}
</script>

<style scoped>
.progress-wrap {
  display: flex;
  gap: 5px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 4px 0;
}

.progress-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.progress-dot.current {
  animation: pulse-dot 0.9s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.25); }
}
</style>
