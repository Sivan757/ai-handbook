<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type TabKey = 'piano' | 'cad3d' | 'board'

const activeTab = ref<TabKey>('board')
const copiedPrompt = ref(false)

// ---- 1. Web Audio 虚拟钢琴 ----
const activeNote = ref<string>('')
const waveform = ref<OscillatorType>('triangle')
let audioCtx: AudioContext | null = null

const pianoKeys = [
  { note: 'C4', label: 'Do', key: 'A', freq: 261.63, sharp: false },
  { note: 'C#4', label: '', key: 'W', freq: 277.18, sharp: true },
  { note: 'D4', label: 'Re', key: 'S', freq: 293.66, sharp: false },
  { note: 'D#4', label: '', key: 'E', freq: 311.13, sharp: true },
  { note: 'E4', label: 'Mi', key: 'D', freq: 329.63, sharp: false },
  { note: 'F4', label: 'Fa', key: 'F', freq: 349.23, sharp: false },
  { note: 'F#4', label: '', key: 'T', freq: 369.99, sharp: true },
  { note: 'G4', label: 'Sol', key: 'G', freq: 392.0, sharp: false },
  { note: 'G#4', label: '', key: 'Y', freq: 415.3, sharp: true },
  { note: 'A4', label: 'La', key: 'H', freq: 440.0, sharp: false },
  { note: 'A#4', label: '', key: 'U', freq: 466.16, sharp: true },
  { note: 'B4', label: 'Si', key: 'J', freq: 493.88, sharp: false },
  { note: 'C5', label: 'Do+', key: 'K', freq: 523.25, sharp: false },
]

const whiteKeys = computed(() => pianoKeys.filter((k) => !k.sharp))
const blackKeys = computed(() => {
  const offsets: Record<string, number> = {
    'C#4': 1,
    'D#4': 2,
    'F#4': 4,
    'G#4': 5,
    'A#4': 6,
  }
  return pianoKeys
    .filter((k) => k.sharp)
    .map((k) => ({ ...k, leftPercent: (offsets[k.note] / 8) * 100 }))
})

function playNote(freq: number, note: string) {
  if (typeof window === 'undefined') return
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return
  if (!audioCtx) audioCtx = new AudioCtx()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = waveform.value
  osc.frequency.setValueAtTime(freq, now)

  gain.gain.setValueAtTime(0.001, now)
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)

  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + 0.66)

  activeNote.value = note
  setTimeout(() => {
    if (activeNote.value === note) activeNote.value = ''
  }, 180)
}

function onKeyDown(e: KeyboardEvent) {
  if (activeTab.value !== 'piano') return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  const hit = pianoKeys.find((k) => k.key === e.key.toUpperCase())
  if (hit && !e.repeat) playNote(hit.freq, hit.note)
}

// ---- 2. 3D 线框模型交互预览（纯 Canvas 透视投影） ----
const canvasRef = ref<HTMLCanvasElement | null>(null)
const rotX = ref(0.45)
const rotY = ref(0.6)
const autoSpin = ref(true)
const modelScale = ref(1.0)
let dragging = false
let lastX = 0
let lastY = 0
let rafId = 0

// 一个简单的阶梯支架（演示零件/体素三维线框）
const vertices: [number, number, number][] = [
  [-1, -0.6, -0.7], [1, -0.6, -0.7], [1, -0.6, 0.7], [-1, -0.6, 0.7],
  [-1, 0, -0.7], [1, 0, -0.7], [1, 0, 0.7], [-1, 0, 0.7],
  [-0.5, 0, -0.45], [0.5, 0, -0.45], [0.5, 0, 0.45], [-0.5, 0, 0.45],
  [-0.5, 0.75, -0.45], [0.5, 0.75, -0.45], [0.5, 0.75, 0.45], [-0.5, 0.75, 0.45],
]
const edges: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
  [8, 9], [9, 10], [10, 11], [11, 8],
  [12, 13], [13, 14], [14, 15], [15, 12],
  [8, 12], [9, 13], [10, 14], [11, 15],
]

function draw3d() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const w = c.width
  const h = c.height
  ctx.clearRect(0, 0, w, h)

  const dark = document.documentElement.classList.contains('dark')
  const strokeMain = dark ? '#5BA7E0' : '#006EBB'
  const strokeGrid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const cx = w / 2
  const cy = h / 2 + 10
  const fov = 240 * modelScale.value

  const project = ([x, y, z]: [number, number, number]) => {
    const cosY = Math.cos(rotY.value)
    const sinY = Math.sin(rotY.value)
    const x1 = x * cosY - z * sinY
    const z1 = x * sinY + z * cosY

    const cosX = Math.cos(rotX.value)
    const sinX = Math.sin(rotX.value)
    const y2 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX

    const d = 3.2 - z2
    return [cx + (x1 * fov) / d, cy - (y2 * fov) / d] as const
  }

  // 参考网格
  ctx.strokeStyle = strokeGrid
  ctx.lineWidth = 1
  for (let i = -2; i <= 2; i++) {
    const a = project([i * 0.6, -0.6, -1.2])
    const b = project([i * 0.6, -0.6, 1.2])
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()

    const c1 = project([-1.2, -0.6, i * 0.6])
    const c2 = project([1.2, -0.6, i * 0.6])
    ctx.beginPath()
    ctx.moveTo(c1[0], c1[1])
    ctx.lineTo(c2[0], c2[1])
    ctx.stroke()
  }

  // 模型边线
  ctx.strokeStyle = strokeMain
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  for (const [i, j] of edges) {
    const p1 = project(vertices[i])
    const p2 = project(vertices[j])
    ctx.beginPath()
    ctx.moveTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
  }

  // 顶点高亮
  ctx.fillStyle = strokeMain
  for (const v of vertices) {
    const p = project(v)
    ctx.beginPath()
    ctx.arc(p[0], p[1], 2.8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function tick() {
  if (activeTab.value === 'cad3d') {
    if (autoSpin.value && !dragging) rotY.value += 0.012
    draw3d()
    rafId = requestAnimationFrame(tick)
  }
}

function startPointer(e: PointerEvent) {
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
}
function movePointer(e: PointerEvent) {
  if (!dragging) return
  rotY.value += (e.clientX - lastX) * 0.012
  rotX.value = Math.max(-1.2, Math.min(1.2, rotX.value + (e.clientY - lastY) * 0.012))
  lastX = e.clientX
  lastY = e.clientY
  draw3d()
}
function stopPointer() {
  dragging = false
}

// ---- 3. 响应式瀑布流 / 办公数据看板 ----
const layoutMode = ref<'masonry' | 'list'>('masonry')
const query = ref('')
const items = ref([
  { id: 1, title: '华东区报价表汇总', dept: '销售', amount: 18.5, status: '已核对', tall: true, note: '已按手机号去重，含 4 月补充协议。' },
  { id: 2, title: '设计素材版权清单', dept: '市场', amount: 4.2, status: '待确认', tall: false, note: '字体授权到期日需法务复核。' },
  { id: 3, title: '春季线下活动物料单', dept: '市场', amount: 9.6, status: '已核对', tall: false, note: '展架尺寸已改为 80×200 cm。' },
  { id: 4, title: '仓储物流月度对账', dept: '运营', amount: 26.0, status: '已核对', tall: true, note: '已排除退货冲红订单 14 笔，金额与财务系统一致。' },
  { id: 5, title: '设备采购申请明细', dept: '行政', amount: 11.8, status: '待确认', tall: false, note: '缺两台显示器的资产编号。' },
])

const filteredItems = computed(() => {
  const q = query.value.trim()
  if (!q) return items.value
  return items.value.filter((i) => i.title.includes(q) || i.dept.includes(q) || i.note.includes(q))
})

const totalAmount = computed(() =>
  filteredItems.value.reduce((acc, i) => acc + i.amount, 0).toFixed(1)
)

function toggleStatus(id: number) {
  const target = items.value.find((i) => i.id === id)
  if (target) target.status = target.status === '已核对' ? '待确认' : '已核对'
}

const prompts: Record<TabKey, string> = {
  board: '做一个单文件 HTML 内部台账看板，不建后端服务。界面采用响应式布局，支持在「瀑布流卡片」和「清单模式」之间切换；顶部提供关键词实时搜索框和金额汇总条；卡片数据自动存入 localStorage 保证刷新不丢失，并支持用 SheetJS 一键导出为 Excel。',
  piano: '用单个 HTML 文件做一个浏览器虚拟钢琴。使用原生 Web Audio API 的 OscillatorNode 合成音色，支持切换三角波与正弦波，并带简单衰减包络；画面包含一个八度黑白琴键，支持鼠标点击和电脑键盘 A-K 键实时弹奏发声。',
  cad3d: '用单个 HTML 文件做一个交互式 3D 模型预览页（通过 CDN 引入 Three.js 和 OrbitControls）。支持鼠标拖拽旋转、滚轮缩放、右侧参数面板实时调节模型尺寸与线框模式，并支持拖拽本地 STL 模型文件直接打开预览。'
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompts[activeTab.value])
    copiedPrompt.value = true
    setTimeout(() => (copiedPrompt.value = false), 1500)
  } catch {
    copiedPrompt.value = false
  }
}

watch(activeTab, (tab) => {
  cancelAnimationFrame(rafId)
  if (tab === 'cad3d' && typeof window !== 'undefined') {
    requestAnimationFrame(tick)
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerup', stopPointer)
  if (activeTab.value === 'cad3d') tick()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('pointerup', stopPointer)
  }
  if (audioCtx) audioCtx.close().catch(() => {})
})
</script>

<template>
  <div class="vs-box">
    <div class="vs-tabs" role="tablist">
      <button
        type="button"
        class="vs-tab"
        :class="{ active: activeTab === 'board' }"
        @click="activeTab = 'board'"
      >
        示例 1：瀑布流与响应式看板
      </button>
      <button
        type="button"
        class="vs-tab"
        :class="{ active: activeTab === 'piano' }"
        @click="activeTab = 'piano'"
      >
        示例 2：Web Audio 虚拟钢琴
      </button>
      <button
        type="button"
        class="vs-tab"
        :class="{ active: activeTab === 'cad3d' }"
        @click="activeTab = 'cad3d'"
      >
        示例 3：3D 旋转与模型预览
      </button>
    </div>

    <div class="vs-stage">
      <!-- Tab 1: 看板 -->
      <div v-show="activeTab === 'board'" class="vs-panel">
        <div class="vs-toolbar">
          <input
            v-model="query"
            class="vs-input"
            type="text"
            placeholder="输入部门或关键词实时过滤（如：市场）"
          />
          <div class="vs-stat">
            匹配 {{ filteredItems.length }} 项 · 合计 {{ totalAmount }} 万
          </div>
          <button
            type="button"
            class="vs-btn"
            @click="layoutMode = layoutMode === 'masonry' ? 'list' : 'masonry'"
          >
            {{ layoutMode === 'masonry' ? '切换列表模式' : '切换瀑布流' }}
          </button>
        </div>

        <div :class="layoutMode === 'masonry' ? 'vs-masonry' : 'vs-list'">
          <div v-for="item in filteredItems" :key="item.id" class="vs-card">
            <div class="vs-card-top">
              <span class="vs-dept">{{ item.dept }}</span>
              <button
                type="button"
                class="vs-status"
                :class="{ ok: item.status === '已核对' }"
                @click="toggleStatus(item.id)"
              >
                {{ item.status }}
              </button>
            </div>
            <div class="vs-card-title">{{ item.title }}</div>
            <div class="vs-card-num">{{ item.amount.toFixed(1) }} 万</div>
            <p class="vs-card-note">{{ item.note }}</p>
          </div>
        </div>
      </div>

      <!-- Tab 2: 虚拟钢琴 -->
      <div v-show="activeTab === 'piano'" class="vs-panel">
        <div class="vs-toolbar">
          <span class="vs-hint">点按琴键或敲击键盘 A S D F G H J K 发声</span>
          <label class="vs-select-wrap">
            <span>音色：</span>
            <select v-model="waveform" class="vs-select">
              <option value="triangle">三角波（柔和）</option>
              <option value="sine">正弦波（清亮）</option>
              <option value="sawtooth">锯齿波（电子）</option>
            </select>
          </label>
        </div>
        <div class="vs-piano">
          <div class="vs-white-row">
            <button
              v-for="k in whiteKeys"
              :key="k.note"
              type="button"
              class="vs-white-key"
              :class="{ pressed: activeNote === k.note }"
              @pointerdown.prevent="playNote(k.freq, k.note)"
            >
              <span class="vs-key-hint">{{ k.key }}</span>
              <span class="vs-key-note">{{ k.label }}</span>
            </button>
          </div>
          <button
            v-for="k in blackKeys"
            :key="k.note"
            type="button"
            class="vs-black-key"
            :class="{ pressed: activeNote === k.note }"
            :style="{ left: k.leftPercent + '%' }"
            @pointerdown.prevent="playNote(k.freq, k.note)"
          >
            {{ k.key }}
          </button>
        </div>
      </div>

      <!-- Tab 3: 3D 交互预览 -->
      <div v-show="activeTab === 'cad3d'" class="vs-panel">
        <div class="vs-toolbar">
          <span class="vs-hint">按住画布拖拽旋转视角</span>
          <label class="vs-range-wrap">
            <span>缩放</span>
            <input v-model.number="modelScale" type="range" min="0.7" max="1.5" step="0.05" />
          </label>
          <button type="button" class="vs-btn" @click="autoSpin = !autoSpin">
            {{ autoSpin ? '暂停自转' : '开启自转' }}
          </button>
        </div>
        <canvas
          ref="canvasRef"
          width="560"
          height="240"
          class="vs-canvas"
          @pointerdown="startPointer"
          @pointermove="movePointer"
        />
      </div>
    </div>

    <div class="vs-prompt-bar">
      <div class="vs-prompt-head">
        <span>对应提示词配方（告诉 AI 的技术词汇）</span>
        <button type="button" class="vs-btn" @click="copyPrompt">
          {{ copiedPrompt ? '已复制' : '复制这段提示词' }}
        </button>
      </div>
      <p class="vs-prompt-text">{{ prompts[activeTab] }}</p>
    </div>
  </div>
</template>

<style scoped>
.vs-box {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  margin: 22px 0;
  background: var(--vp-c-bg-soft);
}
.vs-tabs {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}
.vs-tab {
  flex: 1 1 160px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.vs-tab.active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}
.vs-stage {
  padding: 16px;
}
.vs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}
.vs-input {
  flex: 1 1 200px;
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.vs-stat, .vs-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-right: auto;
}
.vs-btn, .vs-select {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.vs-select-wrap, .vs-range-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}
.vs-masonry {
  column-count: 3;
  column-gap: 10px;
}
@media (max-width: 640px) {
  .vs-masonry {
    column-count: 1;
  }
}
.vs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vs-card {
  break-inside: avoid;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.vs-list .vs-card {
  margin-bottom: 0;
}
.vs-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.vs-dept {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.vs-status {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.vs-status.ok {
  border-color: var(--bk-green);
  color: var(--bk-green);
  background: var(--bk-green-soft);
}
.vs-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.vs-card-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 2px 0 4px;
}
.vs-card-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.vs-piano {
  position: relative;
  height: 150px;
  user-select: none;
  max-width: 520px;
  margin: 0 auto;
}
.vs-white-row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  height: 100%;
}
.vs-white-key {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 8px;
  border-radius: 0 0 6px 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: transform 0.08s, background 0.1s;
}
.vs-white-key.pressed {
  background: var(--bk-accent-soft);
  border-color: var(--vp-c-brand-1);
  transform: translateY(2px);
}
.vs-key-hint {
  font-size: 10px;
  opacity: 0.65;
}
.vs-key-note {
  font-size: 12px;
  font-weight: 600;
}
.vs-black-key {
  position: absolute;
  top: 0;
  width: 8.5%;
  height: 58%;
  transform: translateX(-50%);
  border-radius: 0 0 5px 5px;
  border: 1px solid #1b242c;
  background: #24303b;
  color: #dce4ec;
  font-size: 10px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
  cursor: pointer;
  z-index: 2;
}
.vs-black-key.pressed {
  background: var(--vp-c-brand-1);
  color: #fff;
}
.vs-canvas {
  width: 100%;
  height: 240px;
  display: block;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  cursor: grab;
  touch-action: none;
}
.vs-canvas:active {
  cursor: grabbing;
}
.vs-prompt-bar {
  border-top: 1px solid var(--vp-c-divider);
  padding: 12px 16px;
  background: var(--vp-c-bg);
}
.vs-prompt-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
}
.vs-prompt-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--vp-c-text-1);
}
</style>
