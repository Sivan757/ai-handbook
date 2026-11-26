<script setup lang="ts">
defineProps<{
  part: string
  name: string
  intro?: string
}>()
</script>

<template>
  <section class="bk-shelf">
    <header class="bk-shelf-head">
      <p class="bk-shelf-part">{{ part }}</p>
      <h3 class="bk-shelf-name">{{ name }}</h3>
      <p v-if="intro" class="bk-shelf-intro">{{ intro }}</p>
    </header>
    <div class="bk-shelf-list"><slot /></div>
  </section>
</template>

<style scoped>
.bk-shelf {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 8px 26px;
  padding: 22px 0;
  border-top: 1px solid var(--vp-c-divider);
}
.bk-shelf-part {
  margin: 0;
  font-size: 11px;
  letter-spacing: 3px;
  color: var(--bk-green, #009A45);
}
.bk-shelf-name {
  margin: 6px 0 0;
  font-family: var(--bk-serif);
  font-size: 19px;
  line-height: 1.4;
  color: var(--vp-c-text-1);
  border: none;
  padding: 0;
}
.bk-shelf-intro {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
}
.bk-shelf-list { font-size: 14px; line-height: 2 }
.bk-shelf-list :deep(ul) {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0 22px;
}
.bk-shelf-list :deep(li) { margin: 0 }
.bk-shelf-list :deep(a) {
  display: block;
  padding: 2px 0;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.bk-shelf-list :deep(a:hover) {
  color: var(--bk-accent);
  border-bottom-color: var(--bk-accent);
}
.bk-shelf-list :deep(a:focus-visible) {
  outline: 2px solid var(--bk-accent);
  outline-offset: 2px;
}
@media (max-width: 760px) {
  .bk-shelf { grid-template-columns: 1fr; gap: 4px }
  .bk-shelf-list :deep(ul) { grid-template-columns: 1fr }
}
</style>
