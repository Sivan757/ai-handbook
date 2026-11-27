<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import PageMeta from './components/PageMeta.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import ChapterMark from './components/ChapterMark.vue'
import AnnotationLayer from './components/AnnotationLayer.vue'
import { setupReveal } from './reveal'

const { Layout } = DefaultTheme
const { page } = useData()

let stopReveal: () => void = () => {}
let timer: ReturnType<typeof setTimeout> | null = null

async function arm() {
  stopReveal()
  stopReveal = () => {}
  await nextTick()
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    stopReveal = setupReveal()
  }, 40)
}

onMounted(arm)
watch(() => page.value.relativePath, arm)

onUnmounted(() => {
  stopReveal()
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <ReadingProgress />
  <Layout>
    <template #doc-before>
      <ChapterMark />
    </template>
    <template #doc-after>
      <PageMeta />
    </template>
  </Layout>
  <AnnotationLayer />
</template>
