import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'
import { book, parts } from './theme/book'

// 侧边栏、导航都从书的目录结构生成，改结构只改 theme/book.ts 一处。
const sidebar = parts.map((p) => ({
  text: p.label + '　' + p.name,
  link: p.link,
  collapsed: false,
  items: p.chapters.map((c) => ({ text: c.title, link: c.path })),
}))

const front = parts.filter((p) => ['craft', 'ai', 'ship'].includes(p.id))
const extra = parts.filter((p) => p.id === 'appendix')

// 默认部署在域名根路径 /；如需挂载到子路径可通过 DOCS_BASE 传入。
const rawBase = process.env.DOCS_BASE || '/'
const trimmedBase = rawBase.replace(/^\/+|\/+$/g, '')
const base = trimmedBase ? `/${trimmedBase}/` : '/'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: book.title,
  description: '把 AI 用细的团队手册：学习、提问、协作的基本功与工程实践',
  cleanUrls: true,
  lastUpdated: false,
  markdown: { breaks: true },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: base + 'favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#006EBB' }],
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  themeConfig: {
    nav: [
      { text: '开始', link: '/guide/preface' },
      {
        text: '正文',
        items: front.map((p) => ({ text: p.label + '　' + p.name, link: p.link })),
      },
      {
        text: '附录',
        items: extra.flatMap((p) => p.chapters.map((c) => ({ text: c.title, link: c.path }))),
      },
    ],
    sidebar,
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索这本书', buttonAriaLabel: '搜索这本书' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },
  },
})