// 检查每页的维护信息：有没有 owner、上次复核、下次复核、事实来源；有没有过期。
// 用法：node tools/check-freshness.mjs [--json]
// 过期或字段缺失时非 0 退出，可以挂到 CI 上按周跑。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../docs/', import.meta.url).pathname
const rules = JSON.parse(readFileSync(new URL('../tools/style-rules.json', import.meta.url), 'utf8'))
const jsonOut = process.argv.includes('--json')

const files = []
const walk = (d) => { for (const n of readdirSync(d)) { if (n.startsWith('.') || n === 'node_modules') continue; const p = join(d, n); statSync(p).isDirectory() ? walk(p) : n.endsWith('.md') && files.push(p) } }
walk(root)

const today = new Date().toISOString().slice(0, 10)
const rows = []
for (const f of files) {
  const rel = relative(root, f)
  if (rules.excludeFromFrontmatter.some((n) => rel.endsWith(n))) continue
  const raw = readFileSync(f, 'utf8')
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)
  const get = (k) => (fm ? (fm[1].match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1] || '' : '')
  const sources = fm && /^sources:/m.test(fm[1]) ? (fm[1].match(/^  - .+$/gm) || []).length : 0
  const reviewBy = get('reviewBy').trim()
  const noDue = !reviewBy
  const overdue = !noDue && reviewBy < today
  const dueSoon = !noDue && !overdue && new Date(reviewBy).getTime() - Date.now() < 30 * 86400000
  rows.push({ file: rel, owner: get('owner').trim(), reviewed: get('reviewed').trim(), reviewBy, sources, noDue, overdue, dueSoon })
}

const bad = rows.filter((r) => r.noDue || r.overdue || !r.owner || !r.reviewed)
if (jsonOut) console.log(JSON.stringify({ today, total: rows.length, problems: bad.length, rows }, null, 2))
else {
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n)
  console.log('检查 ' + rows.length + ' 页，今天 ' + today + '\n')
  console.log(pad('页面', 34) + pad('负责人', 12) + pad('上次复核', 12) + pad('下次复核', 12) + '来源数')
  for (const r of rows.sort((a, b) => (a.reviewBy || '').localeCompare(b.reviewBy || ''))) {
    const flag = r.overdue ? ' ← 已过期' : r.noDue ? ' ← 缺日期' : r.dueSoon ? ' ← 一个月内到期' : ''
    console.log(pad(r.file, 34) + pad(r.owner || '—', 12) + pad(r.reviewed || '—', 12) + pad(r.reviewBy || '—', 12) + String(r.sources) + flag)
  }
  console.log('\n问题页 ' + bad.length + ' 个')
}
process.exit(bad.length ? 1 : 0)
