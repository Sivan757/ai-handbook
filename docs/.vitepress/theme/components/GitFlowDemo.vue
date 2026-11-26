<script setup lang="ts">
import StepPlayer from './StepPlayer.vue'
import { gitFlowSvg, gitFlowSteps } from '../demos/git-flow'
</script>

<template>
  <div class="gfd">
    <StepPlayer :svg="gitFlowSvg" :steps="gitFlowSteps" label="一次改动的完整生命周期" />
  </div>
</template>

<style scoped>
.gfd {
  --gfd-line: #7a7466;
  --gfd-halo: rgba(184, 69, 27, 0.45);
}
:global(.dark) .gfd {
  --gfd-line: #a8a196;
  --gfd-halo: rgba(240, 138, 75, 0.55);
}
.gfd :deep(.gll) {
  stroke: var(--gfd-line);
  stroke-width: 2.4;
  fill: none;
  stroke-linecap: round;
  transition: stroke 0.32s ease, stroke-width 0.32s ease, filter 0.32s ease;
}
.gfd :deep(.gnn) {
  fill: var(--vp-c-bg);
  stroke: var(--gfd-line);
  stroke-width: 2.4;
  transition: stroke 0.32s ease, stroke-width 0.32s ease, fill 0.32s ease, filter 0.32s ease;
}
.gfd :deep(.gnt) {
  fill: none;
  stroke: var(--gfd-line);
  stroke-width: 2.4;
  transition: stroke 0.32s ease, stroke-width 0.32s ease, filter 0.32s ease;
}
.gfd :deep(.glb) {
  fill: var(--vp-c-text-2);
  font-size: 13px;
  font-family: var(--bk-serif);
}

/* 当前这一步：加粗 + 描边光晕，一眼能看出该看哪儿 */
.gfd :deep(.is-step-on.gll) {
  stroke: var(--bk-accent);
  stroke-width: 3.6;
  filter: drop-shadow(0 0 3px var(--gfd-halo));
}
.gfd :deep(.is-step-on.gnn) {
  stroke: var(--bk-accent);
  stroke-width: 3.6;
  fill: var(--bk-accent);
  filter: drop-shadow(0 0 4px var(--gfd-halo));
}
.gfd :deep(.is-step-on.gnt) {
  stroke: var(--bk-accent);
  stroke-width: 3.6;
  filter: drop-shadow(0 0 3px var(--gfd-halo));
}
@media (prefers-reduced-motion: reduce) {
  .gfd :deep(.gll),
  .gfd :deep(.gnn),
  .gfd :deep(.gnt) {
    transition: none;
  }
}
</style>