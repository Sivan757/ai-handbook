// 批注管理脚本：供维护者或 AI 批量拉取未处理建议并更新状态。
// 用法：
//   node tools/annotations.mjs pull [--status open|resolved|dismissed|deleted|all] [--page /ai/02-brief] [--json]
//   node tools/annotations.mjs resolve <id1,id2,...> [--note "已采纳修改"]
//   node tools/annotations.mjs dismiss <id1,id2,...> [--note "原因"]
//   node tools/annotations.mjs reply <id> --body "回复内容" [--author "维护者"]
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (!(k in process.env)) process.env[k] = v
  }
}

loadEnvLocal()

const BASE_URL = (process.env.ANNOTATIONS_BASE_URL || 'https://ai-handbook.kapukapu.cn').replace(/\/+$/, '')
const ADMIN_TOKEN = process.env.ANNOTATIONS_ADMIN_TOKEN || ''

function flag(name) {
  const idx = process.argv.indexOf('--' + name)
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1]
  return null
}

function hasFlag(name) {
  return process.argv.includes('--' + name)
}

function requireToken() {
  if (!ADMIN_TOKEN) {
    console.error('缺少 ANNOTATIONS_ADMIN_TOKEN（可在环境变量或 .env.local 中设置）')
    process.exit(1)
  }
}

const cmd = process.argv[2]

if (cmd === 'pull') {
  requireToken()
  const status = flag('status') || 'open'
  const page = flag('page')
  const qs = new URLSearchParams({ status })
  if (page) qs.set('page', page)

  const res = await fetch(`${BASE_URL}/api/admin/annotations?${qs}`, {
    headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('请求失败:', res.status, data)
    process.exit(1)
  }
  if (hasFlag('json')) {
    console.log(JSON.stringify(data, null, 2))
  } else {
    const list = data.annotations || []
    console.log(`共 ${list.length} 条批注（status=${status}）：\n`)
    for (const a of list) {
      console.log(`[${a.status}] ${a.id}`)
      console.log(`  页面: ${a.page_path}${a.heading_id ? '#' + a.heading_id : ''}`)
      console.log(`  提交人: ${a.author_name}${a.author_email ? ' <' + a.author_email + '>' : ''}`)
      console.log(`  原文: 「${a.quote_text}」`)
      console.log(`  建议: ${a.suggestion}`)
      if (a.resolution_note) console.log(`  处理说明: ${a.resolution_note}`)
      if (a.replies?.length) {
        console.log(`  回复(${a.replies.length}):`)
        for (const r of a.replies) console.log(`    - ${r.author_name}: ${r.body}`)
      }
      console.log('')
    }
  }
} else if (cmd === 'resolve' || cmd === 'dismiss' || cmd === 'reopen') {
  requireToken()
  const rawIds = process.argv[3] || ''
  const ids = rawIds.split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) {
    console.error('请传入英文逗号分隔的批注 ID')
    process.exit(1)
  }
  const status = cmd === 'resolve' ? 'resolved' : cmd === 'dismiss' ? 'dismissed' : 'open'
  const note = flag('note') || ''
  const res = await fetch(`${BASE_URL}/api/admin/annotations/batch`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ ids, status, resolution_note: note }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('更新失败:', res.status, data)
    process.exit(1)
  }
  console.log(JSON.stringify(data))
} else if (cmd === 'reply') {
  requireToken()
  const id = process.argv[3]
  const body = flag('body')
  const author = flag('author') || '维护者'
  if (!id || !body) {
    console.error('用法：node tools/annotations.mjs reply <id> --body "内容" [--author "维护者"]')
    process.exit(1)
  }
  const res = await fetch(`${BASE_URL}/api/annotations/${encodeURIComponent(id)}/replies`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ body, author_name: author }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('回复失败:', res.status, data)
    process.exit(1)
  }
  console.log(JSON.stringify(data))
} else {
  console.log('用法：node tools/annotations.mjs <pull|resolve|dismiss|reopen|reply> ...')
}
