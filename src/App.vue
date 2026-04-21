<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
  --color-background-primary: #fcfdff;
  --color-background-secondary: #f1f5fb;
  --color-background-tertiary: #e6ecf4;

  --color-text-primary: #172033;
  --color-text-secondary: #3f4c63;
  --color-text-tertiary: #6a7892;
  --color-text-info: #2e78c9;
  --color-text-danger: #c74f4a;

  --color-border-secondary: #a4b3c9;
  --color-border-tertiary: #d4dcea;
  --color-border-success: #6fb988;

  --border-radius-lg: 14px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { min-height: 100%; }
body {
  font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
  color: var(--color-text-primary);
  background:
    radial-gradient(circle at 6% 12%, rgba(60, 110, 190, 0.14) 0, rgba(60, 110, 190, 0) 45%),
    radial-gradient(circle at 92% 20%, rgba(215, 160, 62, 0.18) 0, rgba(215, 160, 62, 0) 38%),
    linear-gradient(165deg, #edf2f9 0%, #e4eaf3 55%, #e9eef6 100%);
}
input, button, select, textarea { font-family: inherit; }
input[type="email"],
input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
input::placeholder { color: #8190a9; }
input:focus {
  background: #ffffff;
  border-color: #6a86b8;
  box-shadow: 0 0 0 4px rgba(63, 109, 184, 0.14);
}

button { transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease; }
button:active { transform: translateY(1px); }
</style>
