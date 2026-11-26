<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { lookup, parts } from '../book'

const { page } = useData()

// 章节页显示「第几部 · 部名 · 第几章」，分部首页只显示「第几部」。
const info = computed(() => {
  const rel = page.value.relativePath || ''
  const hit = lookup(rel)
  if (hit) return { label: hit.part.label, name: hit.part.name, num: hit.num, partOnly: false }
  const m = rel.match(/^part\/([^.]+)/)
  if (!m) return undefined
  const p = parts.find((x) => x.link === '/part/' + m[1])
  return p ? { label: p.label, name: '', num: 0, partOnly: true } : undefined
})
</script>

<template>
  <div v-if="info" class="bk-mark">
    <span class="bk-mark-part">{{ info.label }}</span>
    <template v-if="!info.partOnly">
      <span class="bk-mark-name">{{ info.name }}</span>
      <span v-if="info.num" class="bk-mark-num">第 {{ info.num }} 章</span>
    </template>
  </div>
</template>

<style scoped>
.bk-mark {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
  letter-spacing: 1.5px;
}
.bk-mark-part { color: var(--bk-green, #009A45) }
.bk-mark-name { color: var(--vp-c-text-3) }
.bk-mark-num { margin-left: auto; color: var(--vp-c-text-3) }
</style>
