<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { withBase } from 'vitepress'

defineProps<{
  src: string
  alt: string
  caption?: string
}>()

const root = ref<HTMLElement | null>(null)
let io: IntersectionObserver | null = null

onMounted(() => {
  if (!root.value) return
  if (typeof IntersectionObserver === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  root.value.classList.add('is-armed')
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        root.value?.classList.add('is-on')
        io?.disconnect()
        io = null
      }
    },
    { threshold: 0.3 }
  )
  io.observe(root.value)
})

onUnmounted(() => io?.disconnect())
</script>

<template>
  <figure ref="root" class="bk-ink">
    <div class="bk-ink-frame">
      <img :src="withBase(src)" :alt="alt" loading="lazy" decoding="async" />
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.bk-ink { margin: 26px 0; text-align: center }
.bk-ink-frame {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 14px;
  overflow: hidden;
}
.bk-ink img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 6px;
}
.bk-ink.is-armed img {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 0.9s cubic-bezier(0.2, 0.7, 0.3, 1);
}
.bk-ink.is-armed.is-on img { clip-path: inset(0 0 0 0) }
.bk-ink figcaption {
  margin-top: 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
@media (prefers-reduced-motion: reduce) {
  .bk-ink.is-armed img { clip-path: none; transition: none }
}
</style>
