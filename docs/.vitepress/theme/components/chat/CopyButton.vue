<script setup lang="ts">
import { ref } from "vue"
import { Check, Copy } from "@lucide/vue"
import type { HTMLAttributes } from "vue"
import { cn } from "../../lib/utils"
import { Button } from "../../ui/button"

const props = defineProps<{
  text: string | (() => string)
  label?: string
  class?: HTMLAttributes["class"]
}>()

const copied = ref(false)

async function copy() {
  const value = typeof props.text === "function" ? props.text() : props.text
  if (!value)
    return
  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1500)
  }
  catch {
    copied.value = false
  }
}
</script>

<template>
  <Button
    variant="ghost"
    size="xs"
    :class="cn('text-muted-foreground hover:text-foreground', props.class)"
    :aria-label="label ? label : '复制内容'"
    :title="copied ? '已复制' : '复制'"
    @click="copy"
  >
    <Check v-if="copied" />
    <Copy v-else />
    <span v-if="label">{{ copied ? "已复制" : label }}</span>
  </Button>
</template>
