// 由 tools/glossary.json 生成 ai-docs/glossary.md。改数据后跑：node tools/gen-glossary.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const tool = (p) => new URL('../tools/' + p, import.meta.url)
const docs = (p) => new URL('../ai-docs/' + p, import.meta.url)
const gl = JSON.parse(readFileSync(tool('glossary.json'), 'utf8'))
const rules = JSON.parse(readFileSync(tool('style-rules.json'), 'utf8'))
const T = String.fromCharCode(96)

const day = new Date().toISOString().slice(0, 10)
const due = new Date(Date.now() + rules.reviewMonths * 30.5 * 86400000).toISOString().slice(0, 10)

const lines = [
  '---',
  'owner: ' + rules.owner,
  'reviewed: ' + day,
  'reviewBy: ' + due,
  'sources: []',
  '---',
  '# 术语表',
  '',
  '同一个概念只用一种叫法。这张表是全文检查的依据，写错会被 ' + T + 'pnpm lint' + T + ' 拦下。',
  '',
  '## 用哪个词',
  '',
  '| 用这个 | 不要用 | 说明 |',
  '|---|---|---|',
  ...gl.terms.map((t) => '| ' + t.term + ' | ' + (t.aka.length ? t.aka.join('、') : '—') + ' | ' + t.note + ' |'),
  '',
  '## 不写的词',
  '',
  '| 词 | 为什么 | 改成 |',
  '|---|---|---|',
  ...gl.banned.map((b) => '| ' + b.word + ' | ' + b.why + ' | ' + (b.fix || '删掉') + ' |'),
  '',
  '## 容易写错',
  '',
  '| 错 | 对 |',
  '|---|---|',
  ...gl.typos.map(([a, b]) => '| ' + a + ' | ' + b + ' |'),
  '',
  '## 怎么执行',
  '',
  '这张表由 ' + T + 'tools/glossary.json' + T + ' 生成，改词请改 JSON 再跑 ' + T + 'pnpm run glossary' + T + '。',
  '',
  '推送前跑一次：',
  '',
  T + T + T + 'bash',
  'pnpm lint      # 术语、禁用词、错别字、标点、空格、标题、代码块、句段长度',
  'pnpm freshness # 每页的复核日期与过期页',
  T + T + T,
  '',
]
writeFileSync(docs('glossary.md'), lines.join('\n'))
console.log('生成 ai-docs/glossary.md：' + gl.terms.length + ' 个术语，' + gl.banned.length + ' 个禁用词，' + gl.typos.length + ' 条订正')