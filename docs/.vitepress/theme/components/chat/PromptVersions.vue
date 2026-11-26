<script setup lang="ts">
import { computed, ref } from "vue"
import type { HTMLAttributes } from "vue"
import { Columns2, Rows3 } from "@lucide/vue"
import { cn } from "../../lib/utils"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs"
import CopyButton from "./CopyButton.vue"

export interface PromptVersion {
  /** 版本名，例如「原始」「改写」 */
  label: string
  /** 这一版发出的原文 */
  text: string
  /** 这一版怎么来的、补了什么 */
  note?: string
  /** 发出去之后的效果 */
  effect?: string
  tone?: "plain" | "recommended" | "warn"
}

const props = withDefaults(defineProps<{
  versions: PromptVersion[]
  title?: string
  hint?: string
  default?: number
  compare?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  compare: false,
})

const active = ref(String(props.default ?? 0))
const comparing = ref(props.compare)
const hasHeader = computed(() => Boolean(props.title || props.hint))
const current = computed(() => props.versions[Number(active.value)] ?? props.versions[0])

function toneClass(tone?: PromptVersion["tone"]) {
  return `pv-pane tone-${tone ?? "plain"}`
}
</script>

<template>
  <section :class="cn('prompt-versions shadcn-scope', props.class)">
    <header v-if="hasHeader" class="pv-head">
      <div class="pv-title-row">
        <span v-if="title" class="pv-title">{{ title }}</span>
        <span class="pv-actions">
          <CopyButton v-if="!comparing && current" :text="current.text" label="复制" />
          <Button variant="ghost" size="xs" @click="comparing = !comparing">
            <Rows3 v-if="comparing" />
            <Columns2 v-else />
            <span>{{ comparing ? "逐条查看" : "并排对比" }}</span>
          </Button>
        </span>
      </div>
      <div v-if="hint" class="pv-hint">{{ hint }}</div>
    </header>

    <div class="pv-body">
      <div v-if="!hasHeader && comparing" class="pv-bar">
        <span class="pv-mode">并排对比</span>
        <span class="pv-actions">
          <Button variant="ghost" size="xs" @click="comparing = false">
            <Rows3 />
            <span>逐条查看</span>
          </Button>
        </span>
      </div>

      <Tabs v-if="!comparing" v-model="active" class="pv-tabs">
        <div class="pv-tabs-bar">
          <TabsList class="pv-list">
          <TabsTrigger
              v-for="(version, index) in versions"
              :key="index"
              :value="String(index)"
              class="pv-trigger"
            >
              <span class="pv-index">v{{ index + 1 }}</span>
              <span>{{ version.label }}</span>
            </TabsTrigger>
          </TabsList>
          <span v-if="!hasHeader" class="pv-actions">
            <CopyButton v-if="current" :text="current.text" label="复制" />
            <Button variant="ghost" size="xs" @click="comparing = true">
              <Columns2 />
              <span>并排对比</span>
            </Button>
          </span>
        </div>
        <TabsContent
          v-for="(version, index) in versions"
          :key="index"
          :value="String(index)"
          class="pv-content"
        >
          <div :class="toneClass(version.tone)">
            <div class="pv-text">{{ version.text }}</div>
            <div v-if="version.note || version.effect" class="pv-meta">
              <div v-if="version.note" class="pv-note">{{ version.note }}</div>
              <div v-if="version.effect" class="pv-effect">
                <Badge variant="outline" class="pv-effect-badge">效果</Badge>
                <span>{{ version.effect }}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div v-else class="pv-compare">
        <div
          v-for="(version, index) in versions"
          :key="index"
          :class="toneClass(version.tone)"
        >
          <div class="pv-compare-head">
            <span class="pv-index">v{{ index + 1 }}</span>
            <span class="pv-compare-label">{{ version.label }}</span>
            <Badge v-if="version.tone === 'recommended'" class="pv-recommend">推荐</Badge>
          </div>
          <div class="pv-text">{{ version.text }}</div>
          <div v-if="version.note || version.effect" class="pv-meta">
            <div v-if="version.note" class="pv-note">{{ version.note }}</div>
            <div v-if="version.effect" class="pv-effect">
              <Badge variant="outline" class="pv-effect-badge">效果</Badge>
              <span>{{ version.effect }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.prompt-versions {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.pv-head {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.pv-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pv-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-right: auto;
}
.pv-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}
.pv-hint {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--vp-c-text-3);
}
.pv-body {
  padding: 10px 12px 14px;
}
.pv-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -2px 0 8px;
  min-height: 24px;
}
.pv-tabs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pv-mode {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.pv-tabs {
  gap: 10px;
}
.pv-list {
  height: auto;
  padding: 4px;
  border-radius: 10px;
}
.pv-trigger {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  gap: 6px;
}
.pv-trigger[data-state="inactive"] {
  color: var(--vp-c-text-2);
}
.pv-trigger[data-state="inactive"]:hover {
  color: var(--vp-c-text-1);
}
.pv-index {
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.pv-content {
  margin-top: 2px;
}
.pv-pane {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  padding: 12px 14px;
}
.pv-pane.tone-recommended {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 26%, var(--vp-c-divider));
  background: color-mix(in srgb, var(--vp-c-brand-soft) 55%, var(--vp-c-bg));
  box-shadow: inset 3px 0 0 var(--vp-c-brand-1);
}
.pv-pane.tone-warn {
  box-shadow: inset 3px 0 0 var(--vp-c-warning-1);
}
.pv-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}
.pv-meta {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pv-note {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.pv-effect {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.pv-effect-badge {
  flex-shrink: 0;
  height: auto;
  padding: 0 6px;
  line-height: 17px;
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  border-color: var(--vp-c-divider);
  background: transparent;
}
.pv-compare {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.pv-compare-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pv-compare-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.pv-recommend {
  height: auto;
  padding: 0 8px;
  line-height: 18px;
  font-size: 10.5px;
}
@media (min-width: 720px) {
  .pv-compare {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media print {
  .pv-head {
    background: transparent;
  }
}
</style>
