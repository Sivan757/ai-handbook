<script setup lang="ts">
import { book } from '../book'
</script>

<template>
  <section class="bk-cover">
    <div class="bk-cover-frame">
      <p class="bk-eyebrow">{{ book.eyebrow }}</p>
      <h1 class="bk-title">{{ book.title }}</h1>
      <p v-if="book.subtitle" class="bk-sub">{{ book.subtitle }}</p>
      <p v-if="book.band" class="bk-band">{{ book.band }}</p>
      <p v-if="book.audience" class="bk-aud">{{ book.audience }}</p>
      <div class="bk-cta"><slot /></div>
    </div>
  </section>
</template>

<style scoped>
.bk-cover {
  margin: 8px 0 0;
  padding: 0;
}
.bk-cover-frame {
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background:
    radial-gradient(120% 120% at 12% 0%, var(--bk-accent-soft) 0%, transparent 58%),
    var(--vp-c-bg-alt);
  padding: 44px 40px 36px;
  position: relative;
  overflow: hidden;
}
.bk-cover-frame::after {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  pointer-events: none;
  opacity: 0.55;
}
.bk-eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 4px;
  color: var(--bk-green, #009A45);
}
.bk-title {
  margin: 14px 0 0;
  font-family: var(--bk-serif);
  font-size: 52px;
  line-height: 1.12;
  letter-spacing: 2px;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
}
.bk-sub {
  margin: 12px 0 0;
  font-family: var(--bk-serif);
  font-size: 20px;
  color: var(--vp-c-text-2);
  letter-spacing: 1px;
}
.bk-band {
  margin: 22px 0 0;
  display: inline-block;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--bk-accent);
  color: #fff;
  font-size: 15px;
  line-height: 1.6;
}
.bk-aud {
  margin: 20px 0 0;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--vp-c-text-2);
}
.bk-cta {
  margin-top: 26px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.bk-cta :deep(p) { margin: 0; display: contents }
.bk-cta :deep(a) {
  display: inline-block;
  padding: 9px 20px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.bk-cta :deep(a:first-child) {
  background: var(--bk-accent);
  border-color: var(--bk-accent);
  color: #fff;
}
.bk-cta :deep(a:hover) {
  transform: translateY(-2px);
  border-color: var(--bk-accent);
}
.bk-cta :deep(a:focus-visible) {
  outline: 2px solid var(--bk-accent);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .bk-cta :deep(a) { transition: none }
  .bk-cta :deep(a:hover) { transform: none }
}
@media (max-width: 640px) {
  .bk-cover-frame { padding: 30px 22px 26px }
  .bk-title { font-size: 34px }
  .bk-sub { font-size: 16px }
  .bk-band { font-size: 13px }
}
</style>
