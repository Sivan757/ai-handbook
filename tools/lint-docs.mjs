// 中文文档检查：页头信息、术语、禁用词、错别字、标点、空格、标题、代码块、句段长度。
// 规则数据在 tools/glossary.json 与 tools/style-rules.json，改数据即可，不用改脚本。
//
// 用法：
//   node tools/lint-docs.mjs
//   node tools/lint-docs.mjs --json
//   node tools/lint-docs.mjs --only 术语
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../docs/', import.meta.url).pathname
const toolDir = new URL('../tools/', import.meta.url).pathname
const rules = JSON.parse(readFileSync(join(toolDir, 'style-rules.json'), 'utf8'))
const gl = JSON.parse(readFileSync(join(toolDir, 'glossary.json'), 'utf8'))
const allowPhrases = gl.allowPhrases || []

const args = process.argv.slice(2)
const jsonOut = args.includes('--json')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const files = []
const walk = (d) => { for (const n of readdirSync(d)) { if (n.startsWith('.') || n === 'node_modules') continue; const p = join(d, n); statSync(p).isDirectory() ? walk(p) : n.endsWith('.md') && files.push(p) } }
walk(root)

const findings = []
const add = (file, line, rule, msg, snippet) => findings.push({ file: relative(root, file), line, rule, msg, snippet: (snippet || '').trim().slice(0, 110) })
const canon = gl.terms.map((t) => t.term)
const termMap = []
for (const t of gl.terms) for (const a of t.aka) termMap.push([a, t.term])
const banned = gl.banned
const typos = gl.typos

// 把 markdown 变成「只剩正文」：去掉 frontmatter、代码块、组件标签、链接地址、行内代码
function plainLines(raw) {
  let s = raw.replace(/^---\n[\s\S]*?\n---\n/, (m) => '\n'.repeat(m.split('\n').length - 1))
  s = s.replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1))
  s = s.replace(/<[A-Za-z][\s\S]*?\/>/g, (m) => '\n'.repeat(m.split('\n').length - 1))
  s = s.replace(/<[^>]+>/g, ' ')
  return s.split('\n').map((ln) =>
    ln.replace(/`[^`]*`/g, ' ')
      .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '[$1]')
      .replace(/\]\((?:[^()]|\([^()]*\))*\)/g, ']')
      .replace(/https?:\/\/\S+/g, ' ')
  )
}

const isTable = (t) => t.startsWith('|')
const isQuote = (t) => t.startsWith('>')

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const lines = plainLines(raw)
  const rel = relative(root, file)

  if (!rules.excludeFromFrontmatter.some((n) => rel.endsWith(n))) {
    const fm = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) add(file, 1, '页头', '缺少 frontmatter：需要 ' + rules.requiredFrontmatter.join('、'), '')
    else for (const k of rules.requiredFrontmatter) if (!new RegExp('^' + k + ':', 'm').test(fm[1])) add(file, 1, '页头', '缺少字段 ' + k, '')
  }

  const skipWords = (rules.skipWordRules || []).some((n) => rel.endsWith(n))
  let fenceOpen = false, paraLines = 0, paraStart = 0, lastHeading = 0
  const rawLines = raw.split('\n')

  lines.forEach((ln, i) => {
    const no = i + 1
    const t = ln.trim()

    if (/^\s*```/.test(rawLines[i])) { fenceOpen = !fenceOpen; const lang = (rawLines[i].match(/```\s*(\S*)/) || [])[1]; if (fenceOpen && !lang) add(file, no, '代码块', '代码块缺少语言标注', rawLines[i]); return }
    if (fenceOpen) return
    if (!t) { paraLines = 0; return }

    const h = t.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      if (level > rules.limits.标题最多级 + 1) add(file, no, '标题', '标题层级超过 ' + rules.limits.标题最多级, t)
      if (lastHeading && level > lastHeading + 1) add(file, no, '标题', '标题层级跳跃：从 H' + lastHeading + ' 到 H' + level, t)
      if (/[。；，、：]$/.test(h[2])) add(file, no, '标题', '标题以点号结尾', t)
      lastHeading = level; paraLines = 0
      return
    }

    if (!isTable(t) && !isQuote(t)) {
      paraLines++; if (paraLines === 1) paraStart = no
      if (paraLines === rules.limits.段落最多行 + 1) add(file, paraStart, '段落', '段落超过 ' + rules.limits.段落最多行 + ' 行', rawLines[paraStart - 1])
    }

    if (!isTable(t) && !isQuote(t)) {
      for (const s of t.split(/(?<=[。！？])/)) {
        const len = s.replace(/\s/g, '').length
        if (len > rules.limits.句子最多字) add(file, no, '句子', '句子 ' + len + ' 字，超过 ' + rules.limits.句子最多字, s)
      }
    }

    const masked = skipWords ? '' : allowPhrases.reduce((acc, p) => acc.split(p).join('　'.repeat(p.length)), t)
    const inLink = (idx) => {
      const before = t.lastIndexOf('[', idx)
      const close = t.lastIndexOf(']', idx)
      return before > close
    }
    for (const b of banned) {
      let from = 0, idx
      while ((idx = masked.indexOf(b.word, from)) >= 0) {
        from = idx + b.word.length
        if (inLink(idx)) continue
        add(file, no, '禁用词', '「' + b.word + '」：' + b.why, t); break
      }
    }
    for (const [bad, good] of typos) if (masked.includes(bad)) add(file, no, '错别字', '「' + bad + '」应为「' + good + '」', t)

    // 「」里是在引用别人的说法或举例，不算自己下的断言
    const outsideQuote = masked.replace(/「[^」]*」/g, (m) => '　'.repeat(m.length))
    if (!skipWords && !isTable(t)) {
      for (const [why, list] of Object.entries(gl.claims || {})) {
        for (const w of list) {
          if (!outsideQuote.includes(w)) continue
          add(file, no, '句式', '「' + w + '」：' + why, t)
          break
        }
      }
    }

    for (const [aka, term] of termMap) {
      let from = 0, idx, hit = false
      while ((idx = masked.indexOf(aka, from)) >= 0) {
        from = idx + aka.length
        // 落在更长规范词里的不算，例如「踩坑记录」中的「坑记录」
        const insideCanon = canon.some((c) => c.includes(aka) && masked.slice(Math.max(0, idx - (c.indexOf(aka))), idx - c.indexOf(aka) + c.length) === c)
        if (insideCanon || inLink(idx)) continue
        hit = true; break
      }
      if (hit) add(file, no, '术语', '「' + aka + '」应统一为「' + term + '」', t)
    }

    const cjk = '[\u4e00-\u9fa5]'
    if (new RegExp(cjk).test(t) && !isTable(t)) {
      for (const p of [', ', '; ', '!', '? ']) if (t.includes(p)) { add(file, no, '标点', '中文里出现了半角标点「' + p.trim() + '」', t); break }
      const m1 = t.match(new RegExp('(' + cjk + ')([A-Za-z])'))
      const m2 = t.match(new RegExp('([A-Za-z])(' + cjk + ')'))
      if (m1) add(file, no, '空格', '中文与英文之间缺空格：「' + m1[0] + '」', t)
      else if (m2) add(file, no, '空格', '英文与中文之间缺空格：「' + m2[0] + '」', t)
    }
  })
}

const filtered = only ? findings.filter((f) => f.rule === only) : findings
const byRule = {}
for (const f of filtered) (byRule[f.rule] ||= []).push(f)

if (jsonOut) console.log(JSON.stringify({ total: filtered.length, byRule, findings: filtered }, null, 2))
else {
  console.log('检查文件 ' + files.length + ' 个，命中 ' + filtered.length + ' 条\n')
  for (const [rule, list] of Object.entries(byRule).sort()) {
    console.log('## ' + rule + '（' + list.length + '）')
    for (const f of list.slice(0, 30)) console.log('  ' + f.file + ':' + f.line + '  ' + f.msg + (f.snippet ? '\n      ' + f.snippet : ''))
    if (list.length > 30) console.log('  ……还有 ' + (list.length - 30) + ' 条')
    console.log('')
  }
}
process.exit(filtered.length ? 1 : 0)