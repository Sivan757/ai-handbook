<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const ratio = ref(0)
let raf = 0

function measure() {
  raf = 0
  const el = document.documentElement
  const max = el.scrollHeight - el.clientHeight
  ratio.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
}

function onScroll() {
  if (!raf) raf = requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="bk-progress" aria-hidden="true">
    <span :style="{ transform: 'scaleX(' + ratio + ')' }" />
  </div>
</template>

<style scoped>
.bk-progress {
  position: fixed;
  inset: 0 0 auto 0;
  height: 2px;
  z-index: 60;
  pointer-events: none;
}
.bk-progress span {
  display: block;
  height: 100%;
  background: var(--bk-green, #009A45);
  transform-origin: 0 50%;
  transition: transform 0.12s linear;
}
@media (prefers-reduced-motion: reduce) {
  .bk-progress span { transition: none }
}
</style>
