<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{ id: string; items: string[] }>()
const done = ref<boolean[]>(props.items.map(() => false))
const key = 'hb-checklist-' + props.id

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    if (Array.isArray(saved) && saved.length === props.items.length) done.value = saved.map(Boolean)
  } catch {}
})

watch(done, (val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}, { deep: true })

const count = computed(() => done.value.filter(Boolean).length)
const percent = computed(() => Math.round((count.value / props.items.length) * 100))
</script>

<template>
  <div class="cl">
    <div class="cl-bar">
      <div class="cl-track"><div class="cl-fill" :style="{ width: percent + '%' }" /></div>
      <span class="cl-num">{{ count }} / {{ items.length }}</span>
    </div>
    <label v-for="(item, i) in items" :key="i" class="cl-item" :class="{ ok: done[i] }">
      <input v-model="done[i]" type="checkbox" />
      <span>{{ item }}</span>
    </label>
  </div>
</template>

<style scoped>
.cl { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 14px 16px; margin: 20px 0; background: var(--vp-c-bg-soft) }
.cl-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px }
.cl-track { flex: 1; height: 6px; border-radius: 3px; background: var(--vp-c-divider); overflow: hidden }
.cl-fill { height: 100%; background: var(--bk-green, #009A45); transition: width .25s }
.cl-num { font-size: 12px; color: var(--vp-c-text-2); min-width: 44px; text-align: right }
.cl-item { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; line-height: 1.7; padding: 4px 0; cursor: pointer }
.cl-item input { margin-top: 4px; accent-color: var(--vp-c-brand-1) }
.cl-item.ok span { color: var(--vp-c-text-3); text-decoration: line-through }
</style>
