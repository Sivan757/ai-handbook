<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  question: string
  options: Array<{ text: string; correct?: boolean; why?: string }>
}>()

const picked = ref<number | null>(null)
const answered = computed(() => picked.value !== null)
const right = computed(() => picked.value !== null && !!props.options[picked.value].correct)
</script>

<template>
  <div class="qz">
    <p class="qz-q">{{ question }}</p>
    <button
      v-for="(o, i) in options"
      :key="i"
      class="qz-opt"
      :class="{
        picked: picked === i,
        good: answered && picked === i && o.correct,
        bad: answered && picked === i && !o.correct,
        okprint: answered && picked !== i && o.correct
      }"
      :disabled="answered"
      @click="picked = i"
    >
      <span class="qz-mark">{{ String.fromCharCode(65 + i) }}</span>
      <span>{{ o.text }}</span>
    </button>
    <p v-if="answered" class="qz-why" :class="{ good: right }">
      <b>{{ right ? '对了。' : '再看一眼。' }}</b>
      {{ options[picked!].why || (right ? '' : options.filter((o) => o.correct)[0]?.why || '') }}
    </p>
    <button v-if="answered" class="qz-reset" @click="picked = null">重选</button>
  </div>
</template>

<style scoped>
.qz { border: 1px solid var(--vp-c-divider); border-radius: 10px; padding: 16px; margin: 20px 0; background: var(--vp-c-bg-soft) }
.qz-q { font-weight: 600; margin: 0 0 10px; font-size: 14px }
.qz-opt {
  display: flex; gap: 10px; align-items: flex-start; width: 100%; text-align: left;
  font-size: 14px; line-height: 1.6; padding: 8px 10px; margin-bottom: 6px;
  border: 1px solid var(--vp-c-divider); border-radius: 8px;
  background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer;
}
.qz-opt:disabled { cursor: default }
.qz-mark { font-weight: 700; color: var(--vp-c-text-3); min-width: 14px }
.qz-opt.good { border-color: #22c55e; background: rgba(34, 197, 94, .08) }
.qz-opt.bad { border-color: #ef4444; background: rgba(239, 68, 68, .08) }
.qz-opt.okprint { border-color: #22c55e; border-style: dashed }
.qz-why { font-size: 13px; line-height: 1.7; margin: 8px 0 0; color: var(--vp-c-text-2) }
.qz-why.good { color: #16a34a }
.qz-reset { margin-top: 8px; font-size: 12px; background: none; border: none; color: var(--vp-c-brand-1); cursor: pointer; padding: 0 }
</style>
