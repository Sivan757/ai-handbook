<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, page } = useData()

// frontmatter 里的日期会被 YAML 解析成 Date，统一成 YYYY-MM-DD
function day(v: unknown): string {
  if (!v) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

const owner = computed(() => (frontmatter.value.owner as string | undefined) || '')
const reviewed = computed(() => day(frontmatter.value.reviewed))
const reviewBy = computed(() => day(frontmatter.value.reviewBy))
const sources = computed<string[]>(() => {
  const s = frontmatter.value.sources
  return Array.isArray(s) ? (s as string[]) : []
})
const isHome = computed(() => page.value.frontmatter.layout === 'home')

const overdue = computed(() => !!reviewBy.value && reviewBy.value < new Date().toISOString().slice(0, 10))
const daysLeft = computed(() => {
  if (!reviewBy.value) return null
  return Math.round((new Date(reviewBy.value).getTime() - Date.now()) / 86400000)
})

// 只显示宿主名和一级路径，避免一排 github.com 分不清
function label(u: string): string {
  try {
    const url = new URL(u)
    const host = url.hostname.replace(/^www\./, '')
    const seg = url.pathname.split('/').filter(Boolean)[0]
    const s = seg ? host + '/' + seg : host
    return s.length > 30 ? s.slice(0, 29) + '…' : s
  } catch {
    return u.slice(0, 30)
  }
}
</script>

<template>
  <aside v-if="!isHome && owner" class="pm">
    <div class="pm-row">
      <span class="pm-k">负责人</span><span class="pm-v">{{ owner }}</span>
      <span class="pm-k">复核</span><span class="pm-v">{{ reviewed }}</span>
      <span class="pm-k">下次复核</span>
      <span class="pm-v" :class="{ warn: overdue }">
        {{ reviewBy }}<template v-if="daysLeft !== null && daysLeft > 0 && daysLeft <= 30">（还有 {{ daysLeft }} 天）</template>
        <template v-if="overdue">· 已过期，请复核后更新</template>
      </span>
    </div>
    <div v-if="sources.length" class="pm-row pm-sources">
      <span class="pm-k">事实来源</span>
      <span class="pm-v">
        <a v-for="u in sources" :key="u" :href="u" :title="u" target="_blank" rel="noreferrer">{{ label(u) }}</a>
      </span>
    </div>
  </aside>
</template>

<style scoped>
.pm {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.pm-row { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; margin-bottom: 6px }
.pm-k { color: var(--vp-c-text-3) }
.pm-k::after { content: '：' }
.pm-v { color: var(--vp-c-text-2) }
.pm-v.warn { color: #e07b39 }
.pm-sources a { margin-right: 12px; color: var(--vp-c-brand-1); text-decoration: none }
.pm-sources a:hover { text-decoration: underline }
</style>
