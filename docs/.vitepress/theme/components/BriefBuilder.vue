<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

const fields = [
  { key: 'goal', label: '目标', hint: '要做成什么，为什么' },
  { key: 'context', label: '背景', hint: '相关的文件、现状、已知信息' },
  { key: 'limits', label: '约束', hint: '不能动什么，必须遵守什么' },
  { key: 'done', label: '验收', hint: '怎样算完成，怎么验证' },
  { key: 'output', label: '输出', hint: '要什么形式的结果' }
] as const

const v = reactive<Record<string, string>>({ goal: '', context: '', limits: '', done: '', output: '' })
const copied = ref(false)

const filled = computed(() => fields.filter((f) => v[f.key].trim().length > 0).length)
const message = computed(() =>
  fields
    .filter((f) => v[f.key].trim())
    .map((f) => (f.key === 'output' ? v[f.key].trim() : '## ' + f.label + '\n' + v[f.key].trim()))
    .join('\n\n')
)

function loadSample() {
  v.goal = '写一份部门季度复盘，周五前交给总监，用于决定下季度的资源和优先级。'
  v.context = '本季度完成三件事：交付两个客户项目、上线一套内部流程、人员从 10 人扩到 12 人。上季度复盘提出的两项改进，完成了一项。具体数据在共享表格里。'
  v.limits = '不点名批评个人，只写有记录的事实。不承诺尚未批准的资源。对客内容不放进复盘。'
  v.done = '总监能据此做下季度资源分配；每项改进都有负责人和截止时间；事实和数据都能对上来源。'
  v.output = '一页以内，先给结论，再列三条事实、三条改进。语气克制，不用形容词堆成绩。'
}

async function copy() {
  try {
    await navigator.clipboard.writeText(message.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="bb">
    <div class="bb-head">
      <span class="bb-score">已填 {{ filled }} / 5</span>
      <button @click="loadSample">填一个例子</button>
      <button :disabled="!filled" @click="copy">{{ copied ? '已复制' : '复制任务简报' }}</button>
    </div>
    <div class="bb-grid">
      <label v-for="f in fields" :key="f.key" class="bb-field" :class="{ ok: v[f.key].trim() }">
        <span class="bb-label">{{ f.label }}</span>
        <textarea v-model="v[f.key]" :placeholder="f.hint" rows="2" />
      </label>
    </div>
    <div v-if="filled" class="bb-preview">
      <div class="bb-preview-label">这些会发给 AI</div>
      <pre>{{ message }}</pre>
    </div>
    <p v-else class="bb-empty">填一项就生成一项。五项都填上，AI 基本不用猜了。</p>
  </div>
</template>

<style scoped>
.bb {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 16px;
  margin: 20px 0;
  background: var(--vp-c-bg-soft);
}
.bb-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.bb-score { font-size: 13px; color: var(--vp-c-text-2); margin-right: auto }
.bb-head button {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.bb-head button:disabled { opacity: .5; cursor: not-allowed }
.bb-grid { display: grid; gap: 10px }
.bb-field { display: block }
.bb-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--vp-c-text-2) }
.bb-field.ok .bb-label { color: var(--vp-c-brand-1) }
.bb-field textarea {
  width: 100%;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  resize: vertical;
  box-sizing: border-box;
}
.bb-preview { margin-top: 14px }
.bb-preview-label { font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 6px }
.bb-preview pre {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.bb-empty { font-size: 13px; color: var(--vp-c-text-3); margin: 10px 0 0 }
</style>
