<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { provide } from "vue"
import { cn } from "../../lib/utils"
import { chatThreadKey } from "./context"

const props = defineProps<{
  title?: string
  class?: HTMLAttributes["class"]
}>()

provide(chatThreadKey, true)
</script>

<template>
  <section :class="cn('chat-thread shadcn-scope', props.class)">
    <header class="chat-thread-head">
      <span class="window-dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="chat-thread-title">{{ title || "一次对话" }}</span>
      <slot name="meta" />
    </header>
    <div class="chat-thread-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.chat-thread {
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.chat-thread-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.window-dots {
  display: inline-flex;
  gap: 5px;
}
.window-dots i {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--vp-c-divider);
}
.chat-thread-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
.chat-thread-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px 16px;
}
.chat-thread-body :deep(.chat-msg) {
  margin: 0;
}
</style>
