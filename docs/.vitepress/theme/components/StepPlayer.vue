<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Step = { title: string; text: string; hl?: string[]; note?: string }

const props = defineProps<{
  steps: Step[]
  svg?: string
  label?: string
}>()

const i = ref(0)
const playing = ref(false)
const reduced = ref(false)
const stage = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const total = computed(() => props.steps.length)
const cur = computed<Step>(() => props.steps[i.value] ?? props.steps[0])

function paint() {
  if (!stage.value) return
  stage.value.classList.add('is-armed')
  const on = new Set((props.steps[i.value]?.hl ?? []) as string[])
  const els = stage.value.querySelectorAll('[data-n]')
  for (let k = 0; k < els.length; k++) {
    const el = els[k]
    const key = el.getAttribute('data-n') || ''
    el.classList.toggle('is-step-on', on.has(key))
  }
}

watch(i, () => paint())

function stop() {
  playing.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
function go(n: number) {
  i.value = Math.max(0, Math.min(total.value - 1, n))
}
function next() {
  if (i.value >= total.value - 1) {
    stop()
    i.value = 0
  } else {
    i.value += 1
  }
}
function prev() {
  stop()
  i.value = Math.max(0, i.value - 1)
}
function play() {
  if (reduced.value) return
  if (playing.value) return stop()
  playing.value = true
  timer = setInterval(() => {
    if (i.value >= total.value - 1) i.value = 0
    else i.value += 1
  }, 2200)
}
function reset() {
  stop()
  i.value = 0
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  } else if (e.key === 'Home') {
    e.preventDefault()
    reset()
  }
}

onMounted(() => {
  reduced.value =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  paint()
})
onBeforeUnmount(stop)
</script>

<template>
  <section class="sp">
    <div v-if="svg" ref="stage" class="sp-stage" v-html="svg" />
    <div class="sp-body" tabindex="0" role="group" :aria-label="(label || '分步演示') + '，可用左右方向键切换'">
      <p class="sp-k">
        <span v-if="label">{{ label }}</span>
        <span class="sp-count">第 {{ i + 1 }} / {{ total }} 步</span>
      </p>
      <p class="sp-t">{{ cur.title }}</p>
      <p class="sp-x">{{ cur.text }}</p>
      <p v-if="cur.note" class="sp-n">{{ cur.note }}</p>
      <div class="sp-dots">
        <button
          v-for="(s, idx) in steps"
          :key="idx"
          type="button"
          class="sp-dot"
          :class="{ on: idx === i }"
          :aria-current="idx === i ? 'step' : undefined"
          :aria-label="'第 ' + (idx + 1) + ' 步：' + s.title"
          @click="go(idx)"
        />
      </div>
      <div class="sp-btns">
        <button type="button" class="sp-btn" :disabled="i === 0" @click="prev">上一步</button>
        <button
          type="button"
          class="sp-btn sp-btn-main"
          :disabled="reduced"
          :title="reduced ? '系统已开启减少动效，自动播放关闭' : ''"
          @click="play"
        >
          {{ playing ? '暂停' : '播放' }}
        </button>
        <button type="button" class="sp-btn" @click="next">下一步</button>
        <button type="button" class="sp-btn sp-btn-ghost" :disabled="i === 0" @click="reset">重播</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sp {
  margin: 26px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.sp-stage {
  padding: 10px 8px 0;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}
.sp-stage :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
.sp-stage :deep([data-n]) {
  opacity: 1;
  transition: opacity 0.32s ease;
}
.sp-stage.is-armed :deep([data-n]) {
  opacity: 0.5;
}
.sp-stage :deep([data-n].is-step-on) {
  opacity: 1;
}
.sp-body {
  padding: 16px 18px 18px;
  outline: none;
}
.sp-body:focus-visible {
  box-shadow: inset 0 0 0 2px var(--bk-accent);
}
.sp-k {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: baseline;
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--vp-c-text-3);
}
.sp-count {
  margin-left: auto;
  color: var(--bk-accent);
}
.sp-t {
  margin: 0;
  font-family: var(--bk-serif);
  font-size: 17px;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}
.sp-x {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}
.sp-n {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vp-c-text-3);
}
.sp-dots {
  display: flex;
  gap: 6px;
  margin: 14px 0 10px;
  flex-wrap: wrap;
}
.sp-dot {
  width: 22px;
  height: 6px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.sp-dot.on {
  background: var(--bk-accent);
  border-color: var(--bk-accent);
}
.sp-dot:focus-visible {
  outline: 2px solid var(--bk-accent);
  outline-offset: 2px;
}
.sp-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sp-btn {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.sp-btn:hover:not(:disabled) {
  border-color: var(--bk-accent);
  color: var(--bk-accent);
}
.sp-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.sp-btn:focus-visible {
  outline: 2px solid var(--bk-accent);
  outline-offset: 2px;
}
.sp-btn-main {
  background: var(--bk-accent);
  border-color: var(--bk-accent);
  color: #fff;
}
.sp-btn-main:hover:not(:disabled) {
  color: #fff;
  filter: brightness(1.06);
}
.sp-btn-ghost {
  margin-left: auto;
  background: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .sp-stage :deep([data-n]) { transition: none }
  .sp-dot { transition: none }
}
</style>