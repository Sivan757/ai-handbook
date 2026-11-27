interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<{ success: boolean; meta: { changes?: number } }>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>
}

interface Fetcher {
  fetch(request: Request): Promise<Response>
}

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  ADMIN_TOKEN?: string
}

type AnnotationStatus = 'open' | 'resolved' | 'dismissed'

interface AnnotationRow {
  id: string
  page_path: string
  heading_id: string
  quote_text: string
  quote_prefix: string
  quote_suffix: string
  suggestion: string
  author_name: string
  author_email?: string
  status: AnnotationStatus
  resolution_note: string
  created_at: string
  updated_at: string
}

interface ReplyRow {
  id: string
  annotation_id: string
  body: string
  author_name: string
  author_email?: string
  is_maintainer: number
  created_at: string
}

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_WRITES = 20

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function normalizePagePath(raw: string): string {
  let p = (raw || '/').split('#')[0].split('?')[0].trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\/+/g, '/')
  p = p.replace(/\.html$/i, '')
  p = p.replace(/\/index$/i, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function cleanText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/\r\n/g, '\n').trim().slice(0, maxLen)
}

function cleanSingleLine(raw: unknown, maxLen: number): string {
  return cleanText(raw, maxLen).replace(/\s+/g, ' ')
}

function isValidEmail(email: string): boolean {
  if (!email) return true
  if (email.length > 120) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = await sha256Bytes(input)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function isAuthorizedAdmin(request: Request, env: Env): Promise<boolean> {
  const expected = env.ADMIN_TOKEN?.trim()
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return false
  const [a, b] = await Promise.all([sha256Bytes(match[1].trim()), sha256Bytes(expected)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const ipHash = await sha256Hex(`ai-handbook-rl:${ip}`)
  const now = Date.now()
  const row = await env.DB.prepare('SELECT window_start, count FROM rate_limits WHERE ip_hash = ?1')
    .bind(ipHash)
    .first<{ window_start: number; count: number }>()

  if (!row || now - row.window_start > RATE_WINDOW_MS) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (ip_hash, window_start, count) VALUES (?1, ?2, 1) ON CONFLICT(ip_hash) DO UPDATE SET window_start = ?2, count = 1'
    )
      .bind(ipHash, now)
      .run()
    return true
  }

  if (row.count >= RATE_MAX_WRITES) return false

  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE ip_hash = ?1')
    .bind(ipHash)
    .run()
  return true
}

async function fetchPublicAnnotations(env: Env, pagePath: string) {
  const { results: rows } = await env.DB.prepare(
    `SELECT id, page_path, heading_id, quote_text, quote_prefix, quote_suffix,
            suggestion, author_name, status, resolution_note, created_at, updated_at
     FROM annotations
     WHERE page_path = ?1 AND status IN ('open', 'resolved')
     ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at ASC`
  )
    .bind(pagePath)
    .all<AnnotationRow>()

  if (!rows.length) return []

  const placeholders = rows.map((_, i) => `?${i + 1}`).join(', ')
  const { results: replies } = await env.DB.prepare(
    `SELECT id, annotation_id, body, author_name, is_maintainer, created_at
     FROM annotation_replies
     WHERE annotation_id IN (${placeholders})
     ORDER BY created_at ASC`
  )
    .bind(...rows.map((r) => r.id))
    .all<ReplyRow>()

  const replyMap = new Map<string, Array<Omit<ReplyRow, 'author_email'>>>()
  for (const r of replies) {
    const list = replyMap.get(r.annotation_id) || []
    list.push({
      id: r.id,
      annotation_id: r.annotation_id,
      body: r.body,
      author_name: r.author_name,
      is_maintainer: r.is_maintainer,
      created_at: r.created_at,
    })
    replyMap.set(r.annotation_id, list)
  }

  return rows.map((row) => ({
    ...row,
    replies: replyMap.get(row.id) || [],
  }))
}

async function handleCreateAnnotation(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: '请求体必须是有效 JSON' }, 400)
  }

  // 蜜罐字段：正常用户留空
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ error: '提交被拦截' }, 400)
  }

  const allowed = await checkRateLimit(request, env)
  if (!allowed) {
    return json({ error: '提交过于频繁，请稍后再试' }, 429)
  }

  const pagePath = normalizePagePath(typeof body.page_path === 'string' ? body.page_path : '')
  if (!pagePath || pagePath.length > 200) {
    return json({ error: '页面路径无效' }, 400)
  }

  const headingId = cleanSingleLine(body.heading_id, 120)
  const quoteText = cleanText(body.quote_text, 600)
  const quotePrefix = cleanText(body.quote_prefix, 80)
  const quoteSuffix = cleanText(body.quote_suffix, 80)
  const suggestion = cleanText(body.suggestion, 2000)
  const authorName = cleanSingleLine(body.author_name, 30)
  const authorEmail = cleanSingleLine(body.author_email, 120)

  if (quoteText.length < 2) return json({ error: '请先选中需要批注的正文内容' }, 400)
  if (suggestion.length < 2) return json({ error: '请填写至少 2 个字的修改建议' }, 400)
  if (!authorName) return json({ error: '请填写你的称呼' }, 400)
  if (!isValidEmail(authorEmail)) return json({ error: '邮箱格式看起来不太对，请检查或留空' }, 400)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO annotations
       (id, page_path, heading_id, quote_text, quote_prefix, quote_suffix,
        suggestion, author_name, author_email, status, resolution_note, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'open', '', ?10, ?10)`
  )
    .bind(
      id,
      pagePath,
      headingId,
      quoteText,
      quotePrefix,
      quoteSuffix,
      suggestion,
      authorName,
      authorEmail,
      now
    )
    .run()

  return json(
    {
      annotation: {
        id,
        page_path: pagePath,
        heading_id: headingId,
        quote_text: quoteText,
        quote_prefix: quotePrefix,
        quote_suffix: quoteSuffix,
        suggestion,
        author_name: authorName,
        status: 'open',
        resolution_note: '',
        created_at: now,
        updated_at: now,
        replies: [],
      },
    },
    201
  )
}

async function handleCreateReply(request: Request, env: Env, annotationId: string): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: '请求体必须是有效 JSON' }, 400)
  }

  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ error: '提交被拦截' }, 400)
  }

  const isMaintainer = (await isAuthorizedAdmin(request, env)) ? 1 : 0
  if (!isMaintainer) {
    const allowed = await checkRateLimit(request, env)
    if (!allowed) {
      return json({ error: '提交过于频繁，请稍后再试' }, 429)
    }
  }

  const existing = await env.DB.prepare(
    'SELECT id, status FROM annotations WHERE id = ?1'
  )
    .bind(annotationId)
    .first<{ id: string; status: AnnotationStatus }>()

  if (!existing || existing.status === 'dismissed') {
    return json({ error: '对应批注不存在' }, 404)
  }

  const replyBody = cleanText(body.body, 1500)
  const authorName = cleanSingleLine(body.author_name, 30) || (isMaintainer ? '维护者' : '')
  const authorEmail = cleanSingleLine(body.author_email, 120)

  if (!replyBody) return json({ error: '回复内容不能为空' }, 400)
  if (!authorName) return json({ error: '请填写你的称呼' }, 400)
  if (!isValidEmail(authorEmail)) return json({ error: '邮箱格式看起来不太对，请检查或留空' }, 400)

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO annotation_replies
         (id, annotation_id, body, author_name, author_email, is_maintainer, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    ).bind(id, annotationId, replyBody, authorName, authorEmail, isMaintainer, now),
    env.DB.prepare('UPDATE annotations SET updated_at = ?1 WHERE id = ?2').bind(now, annotationId),
  ])

  return json(
    {
      reply: {
        id,
        annotation_id: annotationId,
        body: replyBody,
        author_name: authorName,
        is_maintainer: isMaintainer,
        created_at: now,
      },
    },
    201
  )
}

async function handleAdminList(url: URL, env: Env): Promise<Response> {
  const statusParam = url.searchParams.get('status') || 'open'
  const pageParam = url.searchParams.get('page')
  const params: unknown[] = []
  const where: string[] = []

  if (statusParam !== 'all') {
    if (!['open', 'resolved', 'dismissed'].includes(statusParam)) {
      return json({ error: '无效的 status 参数' }, 400)
    }
    params.push(statusParam)
    where.push(`status = ?${params.length}`)
  }

  if (pageParam) {
    params.push(normalizePagePath(pageParam))
    where.push(`page_path = ?${params.length}`)
  }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : ''
  const { results: rows } = await env.DB.prepare(
    `SELECT id, page_path, heading_id, quote_text, quote_prefix, quote_suffix,
            suggestion, author_name, author_email, status, resolution_note, created_at, updated_at
     FROM annotations
     ${clause}
     ORDER BY page_path ASC, created_at ASC`
  )
    .bind(...params)
    .all<AnnotationRow>()

  if (!rows.length) return json({ annotations: [] })

  const placeholders = rows.map((_, i) => `?${i + 1}`).join(', ')
  const { results: replies } = await env.DB.prepare(
    `SELECT id, annotation_id, body, author_name, author_email, is_maintainer, created_at
     FROM annotation_replies
     WHERE annotation_id IN (${placeholders})
     ORDER BY created_at ASC`
  )
    .bind(...rows.map((r) => r.id))
    .all<ReplyRow>()

  const replyMap = new Map<string, ReplyRow[]>()
  for (const r of replies) {
    const list = replyMap.get(r.annotation_id) || []
    list.push(r)
    replyMap.set(r.annotation_id, list)
  }

  return json({
    annotations: rows.map((row) => ({
      ...row,
      replies: replyMap.get(row.id) || [],
    })),
  })
}

async function handleAdminBatchUpdate(request: Request, env: Env): Promise<Response> {
  let body: {
    items?: Array<{ id: string; status: AnnotationStatus; resolution_note?: string }>
    ids?: string[]
    status?: AnnotationStatus
    resolution_note?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: '请求体必须是有效 JSON' }, 400)
  }

  const updates: Array<{ id: string; status: AnnotationStatus; resolution_note: string }> = []
  if (Array.isArray(body.items)) {
    for (const it of body.items) {
      if (!it || typeof it.id !== 'string' || !['open', 'resolved', 'dismissed'].includes(it.status)) {
        return json({ error: 'items 中存在无效条目' }, 400)
      }
      updates.push({
        id: it.id,
        status: it.status,
        resolution_note: cleanText(it.resolution_note, 300),
      })
    }
  } else if (Array.isArray(body.ids) && body.status && ['open', 'resolved', 'dismissed'].includes(body.status)) {
    const note = cleanText(body.resolution_note, 300)
    for (const id of body.ids) {
      if (typeof id === 'string' && id) {
        updates.push({ id, status: body.status, resolution_note: note })
      }
    }
  } else {
    return json({ error: '请提供 items 或 ids + status' }, 400)
  }

  if (!updates.length) return json({ updated: 0 })

  const now = new Date().toISOString()
  const stmts = updates.map((u) =>
    env.DB.prepare(
      'UPDATE annotations SET status = ?1, resolution_note = ?2, updated_at = ?3 WHERE id = ?4'
    ).bind(u.status, u.resolution_note, now, u.id)
  )
  await env.DB.batch(stmts)

  return json({ updated: updates.length, updated_at: now })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true })
    }

    if (url.pathname === '/api/annotations' && request.method === 'GET') {
      const page = normalizePagePath(url.searchParams.get('page') || '/')
      const annotations = await fetchPublicAnnotations(env, page)
      return json({ page, annotations })
    }

    if (url.pathname === '/api/annotations' && request.method === 'POST') {
      return handleCreateAnnotation(request, env)
    }

    const replyMatch = url.pathname.match(/^\/api\/annotations\/([0-9a-f-]{8,64})\/replies$/i)
    if (replyMatch && request.method === 'POST') {
      return handleCreateReply(request, env, replyMatch[1])
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!env.ADMIN_TOKEN?.trim()) {
        return json({ error: '未配置管理员密钥' }, 503)
      }
      if (!(await isAuthorizedAdmin(request, env))) {
        return json({ error: '未授权' }, 401)
      }
      if (url.pathname === '/api/admin/annotations' && request.method === 'GET') {
        return handleAdminList(url, env)
      }
      if (url.pathname === '/api/admin/annotations/batch' && request.method === 'PATCH') {
        return handleAdminBatchUpdate(request, env)
      }
    }

    return json({ error: 'Not Found' }, 404)
  },
}
