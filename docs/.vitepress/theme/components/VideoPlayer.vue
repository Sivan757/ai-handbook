<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  bvid?: string
  page?: number
  yt?: string
  title: string
  duration?: string
}>()

const playing = ref(false)
const src = computed(() => {
  if (props.bvid) return 'https://player.bilibili.com/player.html?isOutside=true&high_quality=1&autoplay=0&bvid=' + props.bvid + '&p=' + (props.page || 1)
  if (props.yt) return 'https://www.youtube.com/embed/' + props.yt
  return ''
})
</script>

<template>
  <div class="vp-wrap">
    <button v-if="!playing" class="vp-card" @click="playing = true">
      <span class="vp-play">▶</span>
      <span class="vp-text">
        <b>{{ title }}</b>
        <small v-if="duration">{{ duration }}　点一下在这个页面里播放</small>
      </span>
    </button>
    <div v-else class="vp-frame">
      <iframe :src="src" scrolling="no" frameborder="0" allowfullscreen />
    </div>
    <p v-if="playing" class="vp-tip">
      加载不出来？<a :href="bvid ? 'https://www.bilibili.com/video/' + bvid : 'https://www.youtube.com/watch?v=' + yt" target="_blank" rel="noreferrer">在新窗口打开</a>
    </p>
  </div>
</template>

<style scoped>
.vp-wrap { margin: 20px 0 }
.vp-card {
  display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
  padding: 18px 20px; border-radius: 12px; cursor: pointer;
  border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.vp-card:hover { border-color: var(--vp-c-brand-1) }
.vp-play { font-size: 20px; color: var(--vp-c-brand-1) }
.vp-text { display: flex; flex-direction: column; gap: 4px }
.vp-text small { color: var(--vp-c-text-3); font-size: 12px }
.vp-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: #000 }
.vp-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0 }
.vp-tip { font-size: 12px; color: var(--vp-c-text-3); margin: 8px 0 0 }
</style>
