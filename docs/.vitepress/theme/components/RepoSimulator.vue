<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { withBase } from 'vitepress'

type Mode = 'files' | 'sim'

interface RepoFile {
  path: string
  tag: string
  role: string
  desc: string
  content: string
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  file?: RepoFile
  children: TreeNode[]
}

interface FlatRow {
  name: string
  path: string
  isDir: boolean
  depth: number
  file?: RepoFile
  hasLitDescendant: boolean
}

const repoFiles: RepoFile[] = [
  {
    path: 'AGENTS.md',
    tag: '必读',
    role: '全局仓库约束',
    desc: '控制在一两屏以内，只写删掉就会让 AI 犯错的命令、目录边界与确认红线。',
    content: [
      '# order-service',
      '',
      '订单与优惠券核销后端服务（TypeScript + PostgreSQL）。',
      '',
      '## 分支与开工前',
      '- 开工先执行 git pull --ff-only && git fetch origin',
      '- 从 origin/dev 拉特性分支（feat/* 或 fix/*），禁止直接向 dev / release / master 推送',
      '',
      '## 常用精确命令',
      '- 安装依赖：pnpm install --frozen-lockfile',
      '- 本地启动：pnpm dev',
      '- 跑单测：pnpm test -- <file>',
      '- 类型与检查：pnpm typecheck && pnpm lint',
      '',
      '## 目录边界与禁改区',
      '- src/modules/order/：标准业务模块样板，新建模块参照此目录分层',
      '- src/generated/：由 OpenAPI 脚本自动生成，严禁手工编辑',
      '- src/utils/price.ts：全仓统一金额计算工具，写新价格逻辑前先检索此文件',
      '',
      '## 必须先报方案、等确认才能干的操作',
      '- 新增或升级第三方依赖',
      '- 修改 db/migrations/ 下的数据库结构或迁移脚本',
      '- 执行 git push、删除分支或任何对测试/生产环境的写操作',
      '',
      '## 验收与汇报',
      '- 改接口必须附上新增或更新的集成测试命令与真实输出',
      '- 禁止修改既有测试断言来凑通过'
    ].join('\n')
  },
  {
    path: '.gitlab-ci.yml',
    tag: '流水线',
    role: '自动化门禁',
    desc: 'MR 触发的机器门禁：类型检查、全量单测、密钥扫描；失败时先读作业日志末尾。',
    content: [
      'stages: [check, test, security]',
      '',
      'typecheck_and_lint:',
      '  stage: check',
      '  script:',
      '    - pnpm install --frozen-lockfile',
      '    - pnpm typecheck && pnpm lint',
      '',
      'unit_and_integration:',
      '  stage: test',
      '  script:',
      '    - pnpm test -- --ci',
      '',
      'secret_scan:',
      '  stage: security',
      '  script:',
      '    - gitleaks detect --no-git -v'
    ].join('\n')
  },
  {
    path: '.agents/skills/new-api-module/SKILL.md',
    tag: '技能',
    role: '模块脚手架技能',
    desc: '开发新建业务模块时按需加载，固定目录分层、路由注册和单测样板。',
    content: [
      '---',
      'name: new-api-module',
      'description: 在 order-service 中新建业务接口模块时使用；改前端或只修单函数 Bug 时不触发。',
      '---',
      '',
      '# 新建业务模块流程',
      '',
      '1. 先只读读取样板目录 `src/modules/order/`（controller、service、schema、test）。',
      '2. 新建目录 `src/modules/<module>/`，严格复用 DTO 校验写法与统一错误码枚举。',
      '3. 路由不会自动挂载，必须在 `src/router/index.ts` 手动注册一行模块路由。',
      '4. 涉及新增表或字段时，生成迁移方案后立刻暂停并报人确认，绝不自动执行 migrate。',
      '5. 生成完毕后先跑 `pnpm test -- src/modules/<module>/` 与 `pnpm typecheck`，贴出完整结果。'
    ].join('\n')
  },
  {
    path: '.agents/skills/mr-self-review/SKILL.md',
    tag: '技能',
    role: '独立交叉评审技能',
    desc: '在独立新会话里触发，专抓 AI 写代码常见的改松断言、超范围和吞异常毛病。',
    content: [
      '---',
      'name: mr-self-review',
      'description: 提 MR 前在干净新会话中交叉评审当前分支相对 origin/dev 的改动。',
      '---',
      '',
      '# 独立会话交叉评审清单',
      '',
      '执行 `git diff origin/dev...HEAD`，按以下五项逐条排查，只报有代码行号佐证的问题：',
      '',
      '1. **测试防线**：是否改松或删除了原有断言？新代码是否有边界空值/并发异常单测？',
      '2. **超范围改动**：是否误改 `src/generated/`、无关模块或未经确认升级了依赖？',
      '3. **重复造轮子**：是否绕开 `src/utils/price.ts` 等现有工具另起炉灶？',
      '4. **错误处理**：是否存在空的 try/catch 吞掉错误或硬编码假返回值？',
      '5. **凭据与调试残留**：是否残留 console.log、本地密钥或硬编码测试账号？'
    ].join('\n')
  },
  {
    path: '.agents/workflows/feature-tdd.md',
    tag: '工作流',
    role: '四步开发工作流',
    desc: '把需求拆成「只读探查 → 测试先行 → 最小实现 → 独立交叉评审」，避免一口气写偏。',
    content: [
      '# 标准需求开发工作流',
      '',
      '## 阶段 1：只读探查（Explore）',
      '- 阅读 `AGENTS.md`，检索相关业务目录与公共工具。',
      '- 输出：可复用符号清单、待改文件列表、潜在契约风险。',
      '',
      '## 阶段 2：测试先行（Red）',
      '- 根据验收边界编写失败的集成/单元测试并运行，贴出失败输出。',
      '- 未经开发者确认用例覆盖充分，不进入实现阶段。',
      '',
      '## 阶段 3：最小实现（Green）',
      '- 仅修改约定范围文件直到测试全绿，禁止改动测试断言迁就实现。',
      '- 执行 `pnpm typecheck && pnpm test` 保留实测输出。',
      '',
      '## 阶段 4：独立交叉评审（Review）',
      '- 关闭编码会话，新开干净会话加载 `mr-self-review` 技能审 diff。',
      '- 按「背景 / 改动 / 验证 / 评审与上线」四节起草 MR 描述。'
    ].join('\n')
  },
  {
    path: 'src/modules/order/controller.ts',
    tag: '样板',
    role: '标准模块样板',
    desc: 'AI 在第 1 阶段探查时读取的样板代码，用来对齐校验、公共函数和错误码格式。',
    content: [
      "import { z } from 'zod'",
      "import { calcDiscount } from '../../utils/price'",
      "import { AppError } from '../../common/errors'",
      '',
      'export const CreateOrderSchema = z.object({',
      '  userId: z.string().min(1),',
      '  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })).min(1),',
      '  couponCode: z.string().optional(),',
      '})',
      '',
      'export async function createOrderHandler(input: unknown) {',
      '  const dto = CreateOrderSchema.parse(input)',
      '  const total = calcDiscount(dto.items, dto.couponCode)',
      "  if (total < 0) throw new AppError('INVALID_AMOUNT', '订单金额非法')",
      '  return { ok: true, total }',
      '}'
    ].join('\n')
  },
  {
    path: 'src/utils/price.ts',
    tag: '复用',
    role: '全仓公共工具',
    desc: 'AGENTS.md 明确要求先检索复用的公共函数，避免 AI 重复造金额计算轮子。',
    content: [
      'export interface OrderItem { sku: string; qty: number; unitPrice?: number }',
      '',
      'export function calcDiscount(items: OrderItem[], couponCode?: string): number {',
      '  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice ?? 100) * item.qty, 0)',
      '  if (!couponCode) return subtotal',
      '  return Math.max(0, subtotal - 20)',
      '}'
    ].join('\n')
  },
  {
    path: 'src/generated/openapi.ts',
    tag: '禁改区',
    role: '自动生成产物',
    desc: 'AGENTS.md 明确禁止手工编辑的目录，接口变更必须修改契约源文件后重跑生成命令。',
    content: [
      '// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY',
      '// Regenerate via: pnpm run gen:openapi',
      '',
      'export interface CouponVerifyResponse {',
      '  valid: boolean',
      '  discountCents: number',
      '  reason?: string',
      '}'
    ].join('\n')
  },
  {
    path: 'docs/adr/0001-coupon-lock.md',
    tag: 'ADR',
    role: '架构决策记录',
    desc: '记下关键方案取舍与「否掉的方案」，防止半年后有人把老方案重提一遍。',
    content: [
      '# 优惠券核销采用数据库行级状态机乐观锁',
      '',
      '状态：已实施',
      '',
      '## 背景',
      '高并发下同一张券在短时间内可能被多个下单请求同时读取为可用状态。',
      '',
      '## 决定',
      "在 `coupons` 表更新语句中带 `WHERE status = 'UNUSED' AND version = ?` 乐观锁。",
      '',
      '## 否掉的方案',
      '- **引入独立 Redis 分布式锁服务**：当前订单吞吐量低，引入跨库锁会增加网络超时和锁续期复杂度，后续 QPS 超过 5000 再重评。',
      '',
      '## 后果',
      '无需新增中间件，所有核销与订单创建在同一个数据库事务内完成。'
    ].join('\n')
  }
]

const simSteps = [
  {
    title: '1. 开场加载红线',
    lit: ['AGENTS.md'],
    prompt: '在订单创建链路增加优惠券核销校验。先只读探查可复用代码与约束，不要动文件。',
    aiAction: '自动读入根目录 AGENTS.md，锁定底线：不能改 src/generated/、价格逻辑先查 src/utils/price.ts、改数据库迁移必须先停下来确认。',
    output: '【只读探查计划】\n- 复用：src/utils/price.ts 的 calcDiscount\n- 样板参照：src/modules/order/controller.ts\n- 风险提示：若需给 coupons 表加 version 字段，将生成迁移脚本并暂停等你确认。',
    tone: 'ok'
  },
  {
    title: '2. 按需挂载技能',
    lit: ['.agents/skills/new-api-module/SKILL.md', 'src/modules/order/controller.ts', 'src/utils/price.ts'],
    prompt: '核销逻辑需要单独抽成 coupon 子模块，按仓库规范来。',
    aiAction: '识别到「新建模块」，按需载入 new-api-module 技能，照着 order/controller.ts 的 Zod 校验与 AppError 写法生成骨架，并复用 price.ts。',
    output: '【已对齐项目技能】\n1. 已按 order/ 结构创建 src/modules/coupon/\n2. 已在 src/router/index.ts 手动注册一行路由\n3. 已记录需求字段变更，等待确认是否生成迁移脚本。',
    tone: 'ok'
  },
  {
    title: '3. 测试先行（红灯）',
    lit: ['.agents/workflows/feature-tdd.md'],
    prompt: '先写过期、门槛不足、并发重复核销三条测试并跑出失败输出，确认前不写业务代码。',
    aiAction: '遵循 feature-tdd.md 阶段 2，先写 coupon.test.ts 并执行 pnpm test，确认 3 条断言全部如期报错。',
    output: '$ pnpm test -- src/modules/coupon/coupon.test.ts\nFAIL 3 tests: expected 400 INVALID_COUPON, received 200',
    tone: 'warn'
  },
  {
    title: '4. 最小实现（绿灯）',
    lit: ['.agents/workflows/feature-tdd.md', 'AGENTS.md'],
    prompt: '测试覆盖够了，现在实现核销逻辑直到全部通过，禁止改动测试断言。',
    aiAction: '只修改 src/modules/coupon/ 与关联调用点，复用 calcDiscount 与乐观锁条件，再跑测试与类型检查。',
    output: '$ pnpm test -- src/modules/coupon/coupon.test.ts && pnpm typecheck\nPASS 3 tests (0 skipped) · Typecheck 0 errors',
    tone: 'ok'
  },
  {
    title: '5. 新会话交叉评审',
    lit: ['.agents/skills/mr-self-review/SKILL.md', '.gitlab-ci.yml', 'src/generated/openapi.ts'],
    prompt: '（新开干净会话）加载 mr-self-review 技能，评审当前分支相对 origin/dev 的全部 diff。',
    aiAction: '脱离编码上下文偏见，逐条核对测试断言、src/generated/ 禁改区与调试残留，拦下提交前遗漏。',
    output: '【交叉评审结论】\n- [需修改] coupon.service.ts:42 遗留一行 console.log(couponCode)\n- [已确认] 既有测试断言未被改松，未动 src/generated/openapi.ts，未新增依赖。',
    tone: 'warn'
  }
]

function buildTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isDir: true, children: [] }
  for (const f of files) {
    const parts = f.path.split('/')
    let cur = root
    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1
      const nodePath = parts.slice(0, idx + 1).join('/')
      let child = cur.children.find((c) => c.name === part)
      if (!child) {
        child = { name: part, path: nodePath, isDir: !isLast, file: isLast ? f : undefined, children: [] }
        cur.children.push(child)
      }
      cur = child
    })
  }
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)))
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(root.children)
  return root.children
}

const tree = buildTree(repoFiles)
const openDirs = reactive(
  new Set([
    '.agents',
    '.agents/skills',
    '.agents/skills/new-api-module',
    '.agents/skills/mr-self-review',
    '.agents/workflows',
    'docs',
    'docs/adr',
    'src',
    'src/modules',
    'src/modules/order',
    'src/utils',
    'src/generated'
  ])
)

const mode = ref<Mode>('files')
const currentPath = ref(repoFiles[0].path)
const simIndex = ref(0)
const copied = ref(false)

const activeFile = computed(() => repoFiles.find((f) => f.path === currentPath.value) || repoFiles[0])
const activeStep = computed(() => simSteps[simIndex.value])
const litSet = computed(() => new Set(mode.value === 'sim' ? activeStep.value.lit : []))
const standaloneUrl = withBase('/demos/repo-blueprint.html')

function hasLit(node: TreeNode, lit: Set<string>): boolean {
  if (!node.isDir) return lit.has(node.path)
  return node.children.some((c) => hasLit(c, lit))
}

const visibleRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = []
  const lit = litSet.value
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({
        name: node.name,
        path: node.path,
        isDir: node.isDir,
        depth,
        file: node.file,
        hasLitDescendant: hasLit(node, lit)
      })
      if (node.isDir && openDirs.has(node.path)) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(tree, 0)
  return rows
})

function toggleDir(path: string) {
  if (openDirs.has(path)) openDirs.delete(path)
  else openDirs.add(path)
}

function openFile(path: string) {
  const parts = path.split('/')
  for (let i = 1; i < parts.length; i++) openDirs.add(parts.slice(0, i).join('/'))
  currentPath.value = path
  mode.value = 'files'
}

function selectStep(idx: number) {
  simIndex.value = idx
  for (const litPath of simSteps[idx].lit) {
    const parts = litPath.split('/')
    for (let i = 1; i < parts.length; i++) openDirs.add(parts.slice(0, i).join('/'))
  }
}

async function copyFile() {
  try {
    await navigator.clipboard.writeText(activeFile.value.content)
    copied.value = true
    setTimeout(() => (copied.value = false), 1400)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="rs-wrap">
    <div class="rs-top">
      <div class="rs-modes">
        <button type="button" class="rs-mode" :class="{ active: mode === 'files' }" @click="mode = 'files'">
          仓库文件树
        </button>
        <button type="button" class="rs-mode" :class="{ active: mode === 'sim' }" @click="mode = 'sim'">
          工作流运行模拟（5 步）
        </button>
      </div>
      <a class="rs-standalone" :href="standaloneUrl" target="_blank" rel="noopener noreferrer">
        新窗口打开单文件 HTML 版 ↗
      </a>
    </div>

    <div class="rs-board">
      <aside class="rs-tree">
        <div class="rs-tree-root">📦 order-service/</div>
        <button
          v-for="row in visibleRows"
          :key="row.path"
          type="button"
          class="rs-item"
          :class="{
            dir: row.isDir,
            file: !row.isDir,
            'lit-dir': row.isDir && row.hasLitDescendant,
            active: mode === 'files' && !row.isDir && row.path === currentPath,
            lit: !row.isDir && litSet.has(row.path)
          }"
          :style="{ paddingLeft: (8 + row.depth * 13 + (row.isDir ? 0 : 14)) + 'px' }"
          @click="row.isDir ? toggleDir(row.path) : openFile(row.path)"
        >
          <span v-if="row.isDir" class="rs-caret">{{ openDirs.has(row.path) ? '▾' : '▸' }}</span>
          <span class="rs-item-name">
            {{ row.isDir ? '📁 ' + row.name + '/' : '📄 ' + row.name }}
          </span>
          <span v-if="!row.isDir && row.file" class="rs-tag" :class="{ warn: row.file.tag === '禁改区' }">
            {{ row.file.tag }}
          </span>
        </button>
      </aside>

      <div v-if="mode === 'files'" class="rs-main">
        <div class="rs-head">
          <span class="rs-path">{{ activeFile.path }}</span>
          <span class="rs-role">{{ activeFile.role }}</span>
          <button type="button" class="rs-btn" @click="copyFile">
            {{ copied ? '已复制' : '复制内容' }}
          </button>
        </div>
        <div class="rs-desc">{{ activeFile.desc }}</div>
        <pre class="rs-code">{{ activeFile.content }}</pre>
      </div>

      <div v-else class="rs-main">
        <div class="rs-steps">
          <button
            v-for="(s, idx) in simSteps"
            :key="s.title"
            type="button"
            class="rs-step"
            :class="{ active: idx === simIndex }"
            @click="selectStep(idx)"
          >
            {{ s.title }}
          </button>
        </div>
        <div class="rs-sim-body">
          <div class="rs-card">
            <div class="rs-card-title">开发者指令</div>
            <p class="rs-card-text">{{ activeStep.prompt }}</p>
          </div>
          <div class="rs-card ok">
            <div class="rs-card-title">本步命中的仓库文件（点击查看原文）</div>
            <div class="rs-chips">
              <button
                v-for="p in activeStep.lit"
                :key="p"
                type="button"
                class="rs-chip"
                @click="openFile(p)"
              >
                {{ p }}
              </button>
            </div>
          </div>
          <div class="rs-card">
            <div class="rs-card-title">AI 执行动作</div>
            <p class="rs-card-text">{{ activeStep.aiAction }}</p>
          </div>
          <div class="rs-card" :class="activeStep.tone">
            <div class="rs-card-title">阶段输出</div>
            <pre class="rs-out">{{ activeStep.output }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rs-wrap { margin: 22px 0; }
.rs-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.rs-modes { display: flex; gap: 8px; flex-wrap: wrap; }
.rs-mode { font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 7px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-2); cursor: pointer; }
.rs-mode.active { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); background: var(--bk-accent-soft); }
.rs-standalone { font-size: 12px; color: var(--vp-c-brand-1); text-decoration: none; padding: 5px 10px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); }
.rs-standalone:hover { border-color: var(--vp-c-brand-1); }
.rs-board { display: grid; grid-template-columns: 265px 1fr; border: 1px solid var(--vp-c-divider); border-radius: 10px; overflow: hidden; background: var(--vp-c-bg); }
@media (max-width: 760px) { .rs-board { grid-template-columns: 1fr; } }
.rs-tree { border-right: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); padding: 10px 8px; }
@media (max-width: 760px) { .rs-tree { border-right: none; border-bottom: 1px solid var(--vp-c-divider); } }
.rs-tree-root { font-family: var(--vp-font-family-mono); font-size: 12px; font-weight: 700; color: var(--vp-c-text-2); padding: 4px 8px 8px; border-bottom: 1px solid var(--vp-c-divider); margin-bottom: 6px; }
.rs-item { width: 100%; display: flex; align-items: center; gap: 5px; padding: 5px 8px; margin-bottom: 2px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: var(--vp-c-text-1); font-size: 12px; text-align: left; cursor: pointer; }
.rs-item:hover { background: var(--vp-c-bg); }
.rs-item.dir { color: var(--vp-c-text-2); font-weight: 600; }
.rs-item.dir.lit-dir { color: var(--bk-green); }
.rs-item.file.active { background: var(--vp-c-bg); border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); font-weight: 600; }
.rs-item.file.lit { box-shadow: inset 3px 0 0 var(--bk-green); background: var(--bk-green-soft); }
.rs-caret { width: 11px; font-size: 10px; flex-shrink: 0; text-align: center; }
.rs-item-name { font-family: var(--vp-font-family-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.rs-tag { font-size: 10px; padding: 1px 6px; border-radius: 99px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-alt); color: var(--vp-c-text-2); flex-shrink: 0; }
.rs-tag.warn { color: #b45309; border-color: #b45309; }
:global(.dark) .rs-tag.warn { color: #f59e0b; border-color: #f59e0b; }
.rs-main { display: flex; flex-direction: column; min-width: 0; }
.rs-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--vp-c-divider); }
.rs-path { font-family: var(--vp-font-family-mono); font-size: 12.5px; font-weight: 700; margin-right: auto; }
.rs-role { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: var(--bk-accent-soft); color: var(--vp-c-brand-1); }
.rs-btn { font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); cursor: pointer; }
.rs-desc { padding: 8px 14px; font-size: 12.5px; color: var(--vp-c-text-2); background: var(--vp-c-bg-alt); border-bottom: 1px solid var(--vp-c-divider); }
.rs-code { margin: 0; padding: 14px; font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; overflow-x: auto; background: var(--vp-c-bg); }
.rs-steps { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px; background: var(--vp-c-bg-alt); border-bottom: 1px solid var(--vp-c-divider); }
.rs-step { font-size: 12px; padding: 5px 9px; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); color: var(--vp-c-text-2); cursor: pointer; }
.rs-step.active { background: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); color: #fff; font-weight: 600; }
.rs-sim-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.rs-card { border: 1px solid var(--vp-c-divider); border-radius: 8px; padding: 10px 12px; background: var(--vp-c-bg-soft); }
.rs-card-title { font-size: 12px; font-weight: 700; color: var(--vp-c-brand-1); margin-bottom: 4px; }
.rs-card.ok .rs-card-title { color: var(--bk-green); }
.rs-card.warn .rs-card-title { color: #b45309; }
:global(.dark) .rs-card.warn .rs-card-title { color: #f59e0b; }
.rs-card-text { margin: 0; font-size: 13px; line-height: 1.6; }
.rs-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rs-chip { font-family: var(--vp-font-family-mono); font-size: 11px; padding: 2px 8px; border-radius: 6px; border: 1px solid var(--bk-green); background: var(--bk-green-soft); color: var(--bk-green); cursor: pointer; }
.rs-out { margin: 4px 0 0; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg); font-family: var(--vp-font-family-mono); font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
</style>
