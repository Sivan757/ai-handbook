// 这本书的结构表。侧边栏、首页目录、每页顶部的部/章标记，都从这里取。

export type Chapter = { path: string; title: string }

export type Part = {
  id: string
  label: string
  name: string
  link: string
  intro: string
  chapters: Chapter[]
}

export const book = {
  title: '提问、验证与交付',
  subtitle: '',
  band: '',
  eyebrow: 'ASK, VERIFY, DELIVER',
  audience: '',
}

export const parts: Part[] = [
  {
    id: 'open',
    label: '序',
    name: '写在前面',
    link: '/guide/preface',
    intro: '',
    chapters: [{ path: '/guide/preface', title: '序' }],
  },
  {
    id: 'craft',
    label: '第一章',
    name: '基本功',
    link: '/foundations/01-ask',
    intro: '',
    chapters: [
      { path: '/foundations/01-ask', title: '提问' },
      { path: '/foundations/02-search', title: '搜索' },
      { path: '/foundations/03-communicate', title: '沟通' },
      { path: '/foundations/04-read', title: '阅读' },
      { path: '/foundations/05-learn', title: '学习' },
      { path: '/foundations/06-notes-checklist', title: '笔记与清单' },
    ],
  },
  {
    id: 'ai',
    label: '第二章',
    name: '模型',
    link: '/ai/01-mental-model',
    intro: '',
    chapters: [
      { path: '/ai/01-mental-model', title: '认识模型' },
      { path: '/ai/02-brief', title: '交代任务' },
      { path: '/ai/03-verify', title: '验证结果' },
      { path: '/ai/04-safety', title: '安全与边界' },
      { path: '/ai/05-assets', title: '知识沉淀' },
    ],
  },
  {
    id: 'ship',
    label: '第三章',
    name: '编程',
    link: '/engineering/01-workflow',
    intro: '',
    chapters: [
      { path: '/engineering/01-workflow', title: '工作流与提示词' },
      { path: '/engineering/02-git', title: 'Git 与分支' },
      { path: '/engineering/03-rules', title: '仓库与技能' },
      { path: '/engineering/04-delivery', title: '评审与流水线' },
      { path: '/engineering/05-postmortem', title: '复盘与决策' },
    ],
  },
  {
    id: 'appendix',
    label: '附录',
    name: '模板、书单与视频',
    link: '/appendix/',
    intro: '',
    chapters: [
      { path: '/templates/', title: '模板' },
      { path: '/library/books', title: '书单' },
      { path: '/video/', title: '视频' },
      { path: '/appendix/vibe-coding', title: '网页示例与词表' },
    ],
  },
]

export const chapterIndex: Record<string, { part: Part; num: number }> = (() => {
  const m: Record<string, { part: Part; num: number }> = {}
  for (const p of parts) {
    p.chapters.forEach((c, i) => {
      m[c.path] = { part: p, num: p.id === 'open' ? 0 : i + 1 }
    })
  }
  return m
})()

export function lookup(relativePath: string): { part: Part; num: number } | undefined {
  let p = '/' + relativePath.replace(/\.md$/, '').replace(/index$/, '')
  if (p !== '/' && !p.endsWith('/') && chapterIndex[p] === undefined) {
    const withSlash = p + '/'
    if (chapterIndex[withSlash]) return chapterIndex[withSlash]
  }
  return chapterIndex[p] ?? chapterIndex[p + '/']
}