<script setup lang="ts">
import { computed, inject, ref } from "vue"
import type { HTMLAttributes } from "vue"
import { cn } from "../../lib/utils"
import { chatThreadKey } from "./context"
import { Badge } from "../../ui/badge"
import CopyButton from "./CopyButton.vue"

const props = withDefaults(defineProps<{
  role?: "user" | "ai"
  label?: string
  text?: string
  time?: string
  copyable?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  role: "user",
  copyable: true,
})

const body = ref<HTMLElement | null>(null)
const inThread = inject(chatThreadKey, false)

const resolvedLabel = computed(() => props.label ?? (props.role === "ai" ? "AI 回复" : "我发给 AI"))

function copyText() {
  if (props.text)
    return props.text
  return body.value?.innerText ?? ""
}
</script>

<template>
  <article
    :class="cn('chat-msg shadcn-scope', `role-${role}`, props.class)"
    :aria-label="resolvedLabel"
  >
    <div class="chat-head">
      <Badge v-if="!inThread" variant="outline" class="chat-label">{{ resolvedLabel }}</Badge>
      <span v-if="time" class="chat-time">{{ time }}</span>
      <CopyButton v-if="copyable" :text="copyText" class="chat-copy" />
    </div>
    <div class="chat-bubble">
      <div ref="body" class="chat-body">
        <div v-if="text" class="chat-text">{{ text }}</div>
        <slot v-else />
      </div>
    </div>
  </article>
</template>

<style scoped>
.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 22px 0;
}
.role-user {
  align-items: flex-end;
}
.role-ai {
  align-items: flex-start;
}
.chat-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 2px;
}
.role-user .chat-head {
  flex-direction: row-reverse;
}
.chat-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
  background: transparent;
  border-radius: 999px;
  padding: 1px 8px;
  height: auto;
  line-height: 18px;
}
.chat-time {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.chat-copy {
  height: 24px;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}
.chat-copy:focus-visible,
.chat-msg:hover .chat-copy {
  opacity: 1;
}
.chat-bubble {
  max-width: 90%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  line-height: 1.75;
}
.role-user .chat-bubble {
  background: var(--vp-c-brand-soft);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 22%, var(--vp-c-divider));
  border-bottom-right-radius: 6px;
}
.role-ai .chat-bubble {
  background: var(--vp-c-bg-soft);
  border-bottom-left-radius: 6px;
}
.chat-body {
  font-size: 14px;
  color: var(--vp-c-text-1);
  min-width: 0;
}
.chat-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.chat-body :deep(p) {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.75;
  color: inherit;
}
.chat-body :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-body :deep(ul),
.chat-body :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 1.35em;
}
.chat-body :deep(li) {
  margin: 0;
  font-size: 14px;
}
.chat-body :deep(strong) {
  font-weight: 600;
  color: inherit;
}
.chat-body :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.chat-body :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  font-size: 0.9em;
}
.chat-body :deep(blockquote) {
  margin: 8px 0;
  padding: 2px 10px;
  border-left: 2px solid var(--vp-c-divider);
  border-radius: 0;
  background: transparent;
}
.chat-body :deep(blockquote > p) {
  font-size: 14px;
  margin: 0;
}
@media (max-width: 640px) {
  .chat-bubble {
    max-width: 100%;
  }
}
@media print {
  .chat-copy {
    display: none;
  }
}
</style>
