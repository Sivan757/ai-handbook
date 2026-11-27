<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

interface ReplyItem {
  id: string
  annotation_id: string
  body: string
  author_name: string
  is_maintainer: number
  created_at: string
}

interface AnnotationItem {
  id: string
  page_path: string
  heading_id: string
  quote_text: string
  quote_prefix: string
  quote_suffix: string
  suggestion: string
  author_name: string
  status: 'open' | 'resolved' | 'dismissed'
  resolution_note: string
  created_at: string
  updated_at: string
  replies: ReplyItem[]
}

interface TextSegment {
  node: Text
  start: number
  end: number
}

interface SelectionDraft {
  quote_text: string
  quote_prefix: string
  quote_suffix: string
  heading_id: string
}

const STORAGE_NAME_KEY = 'bk-annot-author-name'
const STORAGE_EMAIL_KEY = 'bk-annot-author-email'
const STORAGE_DEL_ANNOT_KEY = 'bk-annot-delete-tokens'
const STORAGE_DEL_REPLY_KEY = 'bk-annot-reply-delete-tokens'
const SKIP_SELECTOR =
  '.bk-annot-ignore, .bk-cover, .qz, .rs-wrap, .vs-box, .sp, .pm, .header-anchor, button, svg, script, style, textarea, input, select'

const { page } = useData()

const annotateMode = ref(false)
const loading = ref(false)
const annotations = ref<AnnotationItem[]>([])
const drawerOpen = ref(false)
const drawerTab = ref<'open' | 'resolved'>('open')

// 浮动批注框状态（划词新建 / 点击虚线查看）
const popoverOpen = ref(false)
const popoverPos = ref<{ left: number; top: number }>({ left: 24, top: 96 })
const activeIds = ref<string[]>([])
const draftSelection = ref<SelectionDraft | null>(null)
const showNewFormInExisting = ref(false)

// 表单与回复输入
const authorName = ref('')
const authorEmail = ref('')
const suggestionText = ref('')
const honeypot = ref('')
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

const openReplyForId = ref<string | null>(null)
const replyText = ref('')
const replySubmitting = ref(false)
const replyError = ref('')

const annotDeleteTokens = ref<Record<string, string>>({})
const replyDeleteTokens = ref<Record<string, string>>({})
const confirmDeleteId = ref<string | null>(null)
const confirmDeleteReplyId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteError = ref('')

const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null
let confirmTimer: ReturnType<typeof setTimeout> | null = null
const openAnnotations = computed(() => annotations.value.filter((a) => a.status === 'open'))
const resolvedAnnotations = computed(() => annotations.value.filter((a) => a.status === 'resolved'))

const activeAnnotations = computed(() => {
  if (activeIds.value.length) {
    const idSet = new Set(activeIds.value)
    return annotations.value.filter((a) => idSet.has(a.id))
  }
  if (draftSelection.value) {
    const q = draftSelection.value.quote_text
    return annotations.value.filter(
      (a) => a.quote_text && (a.quote_text.includes(q) || q.includes(a.quote_text))
    )
  }
  return []
})

function normalizePath(raw: string): string {
  let p = (raw || '/').split('#')[0].split('?')[0].trim()
  if (!p.startsWith('/')) p = '/' + p
  p = p.replace(/\/+/g, '/')
  p = p.replace(/\.html$/i, '')
  p = p.replace(/\/index$/i, '/')
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function currentPagePath(): string {
  if (typeof window !== 'undefined') return normalizePath(window.location.pathname)
  return normalizePath('/' + page.value.relativePath.replace(/\.md$/i, ''))
}

function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMsg.value = ''
  }, 2600)
}

function readTokenMap(key: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeTokenMap(key: string, map: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

function loadIdentity() {
  try {
    authorName.value = localStorage.getItem(STORAGE_NAME_KEY) || ''
    authorEmail.value = localStorage.getItem(STORAGE_EMAIL_KEY) || ''
  } catch {
    // ignore storage errors
  }
  annotDeleteTokens.value = readTokenMap(STORAGE_DEL_ANNOT_KEY)
  replyDeleteTokens.value = readTokenMap(STORAGE_DEL_REPLY_KEY)
}

function saveIdentity() {
  try {
    if (authorName.value.trim()) localStorage.setItem(STORAGE_NAME_KEY, authorName.value.trim())
    if (authorEmail.value.trim()) localStorage.setItem(STORAGE_EMAIL_KEY, authorEmail.value.trim())
  } catch {
    // ignore storage errors
  }
}

function saveAnnotToken(id: string, token: string) {
  if (!token) return
  annotDeleteTokens.value = { ...annotDeleteTokens.value, [id]: token }
  writeTokenMap(STORAGE_DEL_ANNOT_KEY, annotDeleteTokens.value)
}

function removeAnnotToken(id: string) {
  const next = { ...annotDeleteTokens.value }
  delete next[id]
  annotDeleteTokens.value = next
  writeTokenMap(STORAGE_DEL_ANNOT_KEY, next)
}

function saveReplyToken(id: string, token: string) {
  if (!token) return
  replyDeleteTokens.value = { ...replyDeleteTokens.value, [id]: token }
  writeTokenMap(STORAGE_DEL_REPLY_KEY, replyDeleteTokens.value)
}

function removeReplyToken(id: string) {
  const next = { ...replyDeleteTokens.value }
  delete next[id]
  replyDeleteTokens.value = next
  writeTokenMap(STORAGE_DEL_REPLY_KEY, next)
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 清理之前注入的正文高亮标记，保持 DOM 原样
function unwrapMarks() {
  if (typeof document === 'undefined') return
  const marks = document.querySelectorAll('mark.bk-annot-mark')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark)
    }
    parent.removeChild(mark)
    parent.normalize()
  })
}

function collectTextIndex(root: Element): { fullText: string; segments: TextSegment[] } {
  const segments: TextSegment[] = []
  let fullText = ''
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let cur: Node | null
  while ((cur = walker.nextNode())) {
    const textNode = cur as Text
    const len = textNode.nodeValue?.length || 0
    if (!len) continue
    segments.push({ node: textNode, start: fullText.length, end: fullText.length + len })
    fullText += textNode.nodeValue
  }
  return { fullText, segments }
}

function findQuoteRange(
  fullText: string,
  item: AnnotationItem,
  root: Element
): { start: number; end: number } | null {
  const quote = item.quote_text
  if (!quote || quote.length < 2) return null

  const prefix = item.quote_prefix || ''
  const suffix = item.quote_suffix || ''

  // 1. 前后文全匹配
  if (prefix || suffix) {
    const pShort = prefix.slice(-16)
    const sShort = suffix.slice(0, 16)
    const combo = pShort + quote + sShort
    const idx = fullText.indexOf(combo)
    if (idx >= 0) {
      return { start: idx + pShort.length, end: idx + pShort.length + quote.length }
    }
    if (pShort) {
      const idxP = fullText.indexOf(pShort + quote)
      if (idxP >= 0) return { start: idxP + pShort.length, end: idxP + pShort.length + quote.length }
    }
    if (sShort) {
      const idxS = fullText.indexOf(quote + sShort)
      if (idxS >= 0) return { start: idxS, end: idxS + quote.length }
    }
  }

  // 2. 收集全部精确匹配位置
  const hits: number[] = []
  let from = 0
  while (from <= fullText.length) {
    const pos = fullText.indexOf(quote, from)
    if (pos < 0) break
    hits.push(pos)
    from = pos + quote.length
  }

  if (hits.length === 1) {
    return { start: hits[0], end: hits[0] + quote.length }
  }

  // 3. 多处出现时，优先靠近 heading_id 的位置
  if (hits.length > 1 && item.heading_id) {
    const heading = document.getElementById(item.heading_id)
    if (heading && root.contains(heading)) {
      const headingText = (heading.textContent || '').trim()
      const hPos = headingText ? fullText.indexOf(headingText) : -1
      if (hPos >= 0) {
        const after = hits.find((h) => h >= hPos)
        if (after !== undefined) return { start: after, end: after + quote.length }
      }
    }
    return { start: hits[0], end: hits[0] + quote.length }
  }

  if (hits.length) return { start: hits[0], end: hits[0] + quote.length }

  // 4. 忽略空白符的模糊回退（兼容换行与跨段落选区）
  const qNoWs = quote.replace(/\s+/g, '')
  if (qNoWs.length < 2) return null
  const chars: string[] = []
  const mapToFull: number[] = []
  for (let i = 0; i < fullText.length; i++) {
    if (!/\s/.test(fullText[i])) {
      chars.push(fullText[i])
      mapToFull.push(i)
    }
  }
  const stripped = chars.join('')
  const pNoWs = prefix.replace(/\s+/g, '').slice(-12)
  let sIdx = pNoWs ? stripped.indexOf(pNoWs + qNoWs) : -1
  if (sIdx >= 0) sIdx += pNoWs.length
  else sIdx = stripped.indexOf(qNoWs)
  if (sIdx < 0) return null

  return {
    start: mapToFull[sIdx],
    end: mapToFull[sIdx + qNoWs.length - 1] + 1,
  }
}

function applyHighlights() {
  if (typeof document === 'undefined') return
  unwrapMarks()

  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const targets = openAnnotations.value
  if (!targets.length) return

  const { fullText, segments } = collectTextIndex(doc)
  if (!fullText) return

  // 为每个文本节点收集被命中的区间与对应批注 ID
  const nodeRanges = new Map<Text, Array<{ start: number; end: number; ids: string[] }>>()

  for (const item of targets) {
    const range = findQuoteRange(fullText, item, doc)
    if (!range) continue
    for (const seg of segments) {
      if (seg.end <= range.start || seg.start >= range.end) continue
      const localStart = Math.max(0, range.start - seg.start)
      const localEnd = Math.min(seg.end - seg.start, range.end - seg.start)
      if (localEnd <= localStart) continue
      const arr = nodeRanges.get(seg.node) || []
      arr.push({ start: localStart, end: localEnd, ids: [item.id] })
      nodeRanges.set(seg.node, arr)
    }
  }

  // 将同一文本节点中的重叠区间拆分并合并批注 ID，从后向前包裹，避免偏移变化
  for (const [textNode, rawRanges] of nodeRanges.entries()) {
    const text = textNode.nodeValue || ''
    if (!text) continue

    const points = new Set<number>()
    for (const r of rawRanges) {
      points.add(r.start)
      points.add(r.end)
    }
    const sorted = Array.from(points).sort((a, b) => a - b)

    const merged: Array<{ start: number; end: number; ids: string[] }> = []
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (b <= a) continue
      const idSet = new Set<string>()
      for (const r of rawRanges) {
        if (r.start <= a && r.end >= b) {
          for (const id of r.ids) idSet.add(id)
        }
      }
      if (idSet.size > 0) {
        merged.push({ start: a, end: b, ids: Array.from(idSet) })
      }
    }

    for (let i = merged.length - 1; i >= 0; i--) {
      const piece = merged[i]
      const curNode = textNode
      if ((curNode.nodeValue || '').length < piece.end) continue
      const middle = curNode.splitText(piece.start)
      middle.splitText(piece.end - piece.start)
      const mark = document.createElement('mark')
      mark.className = 'bk-annot-mark'
      mark.dataset.annotIds = piece.ids.join(',')
      mark.title = '点击查看批注与修改建议'
      middle.parentNode?.insertBefore(mark, middle)
      mark.appendChild(middle)
    }
  }
}

async function loadAnnotations() {
  const path = currentPagePath()
  loading.value = true
  try {
    const res = await fetch(`/api/annotations?page=${encodeURIComponent(path)}`, {
      headers: { accept: 'application/json' },
    })
    const ctype = res.headers.get('content-type') || ''
    if (!res.ok || !ctype.includes('application/json')) {
      annotations.value = []
      unwrapMarks()
      return
    }
    const data = (await res.json()) as { annotations?: AnnotationItem[] }
    annotations.value = Array.isArray(data.annotations) ? data.annotations : []
    await nextTick()
    if (renderTimer) clearTimeout(renderTimer)
    renderTimer = setTimeout(applyHighlights, 70)
  } catch {
    annotations.value = []
  } finally {
    loading.value = false
  }
}

function positionPopoverNearRect(rect: DOMRect) {
  if (typeof window === 'undefined') return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(400, vw - 24)
  const estH = 380

  let left = rect.left + rect.width / 2 - cardW / 2
  left = Math.max(12, Math.min(vw - cardW - 12, left))

  let top = rect.bottom + 10
  if (top + estH > vh - 16) {
    const above = rect.top - estH - 10
    top = above >= 72 ? above : Math.max(72, vh - estH - 16)
  }
  popoverPos.value = { left, top }
}

function findNearestHeadingId(node: Node | null): string {
  let el: Element | null = node instanceof Element ? node : node?.parentElement || null
  const doc = document.querySelector('.vp-doc')
  if (!doc || !el) return ''

  // 先检查自身是否在标题内
  const selfHeading = el.closest('h1[id], h2[id], h3[id]')
  if (selfHeading?.id) return selfHeading.id

  // 向上找所属块级元素，再往前找最近的标题
  let block: Element | null = el
  while (block && block.parentElement && block.parentElement !== doc && !block.parentElement.matches('.vp-doc > div')) {
    block = block.parentElement
  }

  const headings = Array.from(doc.querySelectorAll('h1[id], h2[id], h3[id]'))
  let lastId = ''
  for (const h of headings) {
    if (!h.id) continue
    const cmp = h.compareDocumentPosition(el)
    if (cmp & Node.DOCUMENT_POSITION_FOLLOWING) {
      lastId = h.id
    }
  }
  return lastId
}

function handleDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (target.closest('.bk-annot-ignore')) return

  const mark = target.closest('mark.bk-annot-mark') as HTMLElement | null
  if (!mark) return

  const ids = (mark.dataset.annotIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!ids.length) return

  e.preventDefault()
  e.stopPropagation()

  activeIds.value = ids
  draftSelection.value = null
  showNewFormInExisting.value = false
  openReplyForId.value = null
  replyText.value = ''
  submitError.value = ''
  submitSuccess.value = ''
  positionPopoverNearRect(mark.getBoundingClientRect())
  popoverOpen.value = true
}

function handleSelectionEnd() {
  if (!annotateMode.value) return
  if (typeof window === 'undefined') return

  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  const doc = document.querySelector('.vp-doc')
  if (!doc) return

  const commonEl =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement
  if (!commonEl || !doc.contains(commonEl) || commonEl.closest(SKIP_SELECTOR)) return

  const quote = sel.toString().replace(/\s+/g, ' ').trim()
  if (quote.length < 2) return

  // 提取前后文用于后端及刷新后精准锚定
  let prefix = ''
  let suffix = ''
  const containerBlock = commonEl.closest('p, li, blockquote, td, th, h1, h2, h3, .chat-text, .chat-body') || doc
  const blockText = (containerBlock.textContent || '').replace(/\s+/g, ' ')
  const hitIdx = blockText.indexOf(quote)
  if (hitIdx >= 0) {
    prefix = blockText.slice(Math.max(0, hitIdx - 32), hitIdx)
    suffix = blockText.slice(hitIdx + quote.length, hitIdx + quote.length + 32)
  }

  draftSelection.value = {
    quote_text: quote.slice(0, 600),
    quote_prefix: prefix,
    quote_suffix: suffix,
    heading_id: findNearestHeadingId(range.startContainer),
  }
  activeIds.value = []
  showNewFormInExisting.value = true
  openReplyForId.value = null
  replyText.value = ''
  submitError.value = ''
  submitSuccess.value = ''
  suggestionText.value = ''
  positionPopoverNearRect(range.getBoundingClientRect())
  popoverOpen.value = true
}

async function submitAnnotation() {
  if (!draftSelection.value && !activeAnnotations.value.length) return
  const baseQuote = draftSelection.value || {
    quote_text: activeAnnotations.value[0].quote_text,
    quote_prefix: activeAnnotations.value[0].quote_prefix,
    quote_suffix: activeAnnotations.value[0].quote_suffix,
    heading_id: activeAnnotations.value[0].heading_id,
  }

  const name = authorName.value.trim()
  const email = authorEmail.value.trim()
  const suggestion = suggestionText.value.trim()

  if (suggestion.length < 2) {
    submitError.value = '请填写至少 2 个字的修改建议'
    return
  }
  if (!name) {
    submitError.value = '请填写你的称呼'
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    const res = await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        page_path: currentPagePath(),
        heading_id: baseQuote.heading_id,
        quote_text: baseQuote.quote_text,
        quote_prefix: baseQuote.quote_prefix,
        quote_suffix: baseQuote.quote_suffix,
        suggestion,
        author_name: name,
        author_email: email,
        website: honeypot.value,
      }),
    })
    const ctype = res.headers.get('content-type') || ''
    if (!ctype.includes('application/json')) {
      throw new Error('当前本地预览环境未连接批注服务，线上站点可正常提交')
    }
    const data = (await res.json()) as {
      annotation?: AnnotationItem
      delete_token?: string
      error?: string
    }
    if (!res.ok || !data.annotation) {
      throw new Error(data.error || '提交失败，请稍后重试')
    }

    saveIdentity()
    if (data.delete_token) saveAnnotToken(data.annotation.id, data.delete_token)
    annotations.value = [...annotations.value, data.annotation]
    activeIds.value = [data.annotation.id]
    draftSelection.value = null
    showNewFormInExisting.value = false
    suggestionText.value = ''
    submitSuccess.value = '批注已保存并公开展示'
    window.getSelection()?.removeAllRanges()

    await nextTick()
    applyHighlights()
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

async function submitReply(annotationId: string) {
  const name = authorName.value.trim()
  const email = authorEmail.value.trim()
  const body = replyText.value.trim()

  if (!body) {
    replyError.value = '请填写补充内容'
    return
  }
  if (!name) {
    replyError.value = '请填写你的称呼'
    return
  }

  replySubmitting.value = true
  replyError.value = ''
  try {
    const res = await fetch(`/api/annotations/${encodeURIComponent(annotationId)}/replies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        body,
        author_name: name,
        author_email: email,
        website: honeypot.value,
      }),
    })
    const ctype = res.headers.get('content-type') || ''
    if (!ctype.includes('application/json')) {
      throw new Error('当前本地预览环境未连接批注服务')
    }
    const data = (await res.json()) as {
      reply?: ReplyItem
      delete_token?: string
      error?: string
    }
    if (!res.ok || !data.reply) {
      throw new Error(data.error || '回复失败，请稍后重试')
    }

    saveIdentity()
    if (data.delete_token) saveReplyToken(data.reply.id, data.delete_token)
    const target = annotations.value.find((a) => a.id === annotationId)
    if (target) {
      target.replies = [...target.replies, data.reply]
    }
    replyText.value = ''
    openReplyForId.value = null
  } catch (err) {
    replyError.value = err instanceof Error ? err.message : '回复失败，请稍后重试'
  } finally {
    replySubmitting.value = false
  }
}

async function deleteAnnotation(annotationId: string) {
  if (confirmDeleteId.value !== annotationId) {
    confirmDeleteId.value = annotationId
    confirmDeleteReplyId.value = null
    deleteError.value = ''
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => {
      if (confirmDeleteId.value === annotationId) confirmDeleteId.value = null
    }, 4000)
    return
  }

  const token = annotDeleteTokens.value[annotationId]
  if (!token) return

  deletingId.value = annotationId
  deleteError.value = ''
  try {
    const res = await fetch(`/api/annotations/${encodeURIComponent(annotationId)}`, {
      method: 'DELETE',
      headers: { 'x-delete-token': token },
    })
    const data = (await res.json()) as { deleted?: boolean; error?: string }
    if (!res.ok || !data.deleted) {
      throw new Error(data.error || '删除失败，请稍后重试')
    }

    removeAnnotToken(annotationId)
    annotations.value = annotations.value.filter((a) => a.id !== annotationId)
    activeIds.value = activeIds.value.filter((id) => id !== annotationId)
    confirmDeleteId.value = null
    if (popoverOpen.value && !draftSelection.value && activeIds.value.length === 0) {
      closePopover()
    }
    await nextTick()
    applyHighlights()
    showToast('已删除该条批注')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : '删除失败，请稍后重试'
  } finally {
    deletingId.value = null
  }
}

async function deleteReply(annotationId: string, replyId: string) {
  if (confirmDeleteReplyId.value !== replyId) {
    confirmDeleteReplyId.value = replyId
    confirmDeleteId.value = null
    deleteError.value = ''
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => {
      if (confirmDeleteReplyId.value === replyId) confirmDeleteReplyId.value = null
    }, 4000)
    return
  }

  const token = replyDeleteTokens.value[replyId]
  if (!token) return

  deletingId.value = replyId
  deleteError.value = ''
  try {
    const res = await fetch(
      `/api/annotations/${encodeURIComponent(annotationId)}/replies/${encodeURIComponent(replyId)}`,
      {
        method: 'DELETE',
        headers: { 'x-delete-token': token },
      }
    )
    const data = (await res.json()) as { deleted?: boolean; error?: string }
    if (!res.ok || !data.deleted) {
      throw new Error(data.error || '删除失败，请稍后重试')
    }

    removeReplyToken(replyId)
    const target = annotations.value.find((a) => a.id === annotationId)
    if (target) {
      target.replies = target.replies.filter((r) => r.id !== replyId)
    }
    confirmDeleteReplyId.value = null
    showToast('已删除该条回复')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : '删除失败，请稍后重试'
  } finally {
    deletingId.value = null
  }
}

function closePopover() {
  popoverOpen.value = false
  draftSelection.value = null
  activeIds.value = []
  openReplyForId.value = null
  confirmDeleteId.value = null
  confirmDeleteReplyId.value = null
  submitError.value = ''
  submitSuccess.value = ''
  replyError.value = ''
  deleteError.value = ''
}

function toggleAnnotateMode() {
  annotateMode.value = !annotateMode.value
  if (annotateMode.value) {
    showToast('已进入批注模式：划词选中正文即可提修改建议')
  } else {
    showToast('已退出批注模式')
  }
}

function jumpToAnnotation(item: AnnotationItem) {
  drawerOpen.value = false
  const marks = Array.from(document.querySelectorAll('mark.bk-annot-mark')) as HTMLElement[]
  const hit = marks.find((m) => (m.dataset.annotIds || '').split(',').includes(item.id))
  if (hit) {
    hit.scrollIntoView({ behavior: 'smooth', block: 'center' })
    hit.classList.add('is-flash')
    setTimeout(() => hit.classList.remove('is-flash'), 1600)
    setTimeout(() => {
      activeIds.value = [item.id]
      draftSelection.value = null
      showNewFormInExisting.value = false
      positionPopoverNearRect(hit.getBoundingClientRect())
      popoverOpen.value = true
    }, 320)
    return
  }

  if (item.heading_id) {
    const h = document.getElementById(item.heading_id)
    h?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  activeIds.value = [item.id]
  draftSelection.value = null
  showNewFormInExisting.value = false
  popoverPos.value = {
    left: Math.max(20, window.innerWidth / 2 - 200),
    top: 110,
  }
  popoverOpen.value = true
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (popoverOpen.value) {
    closePopover()
  } else if (drawerOpen.value) {
    drawerOpen.value = false
  } else if (annotateMode.value) {
    annotateMode.value = false
  }
}

onMounted(() => {
  loadIdentity()
  loadAnnotations()
  document.addEventListener('click', handleDocumentClick, true)
  document.addEventListener('mouseup', handleSelectionEnd)
  document.addEventListener('touchend', handleSelectionEnd)
  document.addEventListener('keydown', handleKeydown)
})

watch(
  () => page.value.relativePath,
  () => {
    closePopover()
    drawerOpen.value = false
    loadAnnotations()
  }
)

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (renderTimer) clearTimeout(renderTimer)
  if (confirmTimer) clearTimeout(confirmTimer)
  unwrapMarks()
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('mouseup', handleSelectionEnd)
  document.removeEventListener('touchend', handleSelectionEnd)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="bk-annot-ignore">
    <!-- 批注模式顶部提示条 -->
    <div v-if="annotateMode" class="bk-annot-banner" role="status">
      <span class="bk-annot-banner-dot" aria-hidden="true"></span>
      <span>批注模式已开启：在正文中划词选中任意文字，即可弹出批注框提出修改建议</span>
      <button type="button" class="bk-annot-banner-exit" @click="annotateMode = false">退出</button>
    </div>

    <!-- 右下角轻量浮动工具栏 -->
    <div class="bk-annot-dock">
      <button
        type="button"
        class="bk-annot-pill"
        :class="{ active: annotateMode }"
        @click="toggleAnnotateMode"
      >
        <span class="bk-annot-pill-dot" aria-hidden="true"></span>
        <span>{{ annotateMode ? '退出批注' : '批注模式' }}</span>
      </button>

      <button
        type="button"
        class="bk-annot-pill subtle"
        @click="drawerOpen = true"
      >
        <span>批注记录</span>
        <span class="bk-annot-count" :class="{ has: annotations.length > 0 }">
          {{ loading ? '…' : annotations.length }}
        </span>
      </button>
    </div>

    <!-- 轻提示 -->
    <div v-if="toastMsg" class="bk-annot-toast">{{ toastMsg }}</div>

    <!-- 划词 / 点击虚线弹出的批注框与评论列表 -->
    <div
      v-if="popoverOpen"
      class="bk-annot-backdrop"
      @click.self="closePopover"
    >
      <section
        class="bk-annot-popover"
        :style="{ left: popoverPos.left + 'px', top: popoverPos.top + 'px' }"
        role="dialog"
        aria-label="文档批注"
      >
        <header class="bk-annot-pop-head">
          <span class="bk-annot-pop-title">
            {{ draftSelection ? '提出修改建议' : `批注详情（${activeAnnotations.length} 条）` }}
          </span>
          <button type="button" class="bk-annot-close" aria-label="关闭" @click="closePopover">×</button>
        </header>

        <div class="bk-annot-pop-body">
          <!-- 原文摘录 -->
          <div class="bk-annot-quote-box">
            <p class="bk-annot-quote-label">选中原文</p>
            <p class="bk-annot-quote-text">
              「{{ draftSelection ? draftSelection.quote_text : activeAnnotations[0]?.quote_text }}」
            </p>
          </div>

          <p v-if="submitSuccess" class="bk-annot-msg ok">{{ submitSuccess }}</p>

          <!-- 关联已有批注与评论列表 -->
          <div v-if="activeAnnotations.length" class="bk-annot-list">
            <p v-if="draftSelection" class="bk-annot-section-label">
              该处已有批注与讨论（{{ activeAnnotations.length }}）
            </p>

            <article
              v-for="item in activeAnnotations"
              :key="item.id"
              class="bk-annot-card"
            >
              <div class="bk-annot-card-meta">
                <span class="bk-annot-author">{{ item.author_name }}</span>
                <span class="bk-annot-badge" :class="item.status">
                  {{ item.status === 'resolved' ? '已采纳' : '待处理' }}
                </span>
                <span class="bk-annot-time">{{ formatTime(item.created_at) }}</span>
              </div>

              <p class="bk-annot-card-text">{{ item.suggestion }}</p>

              <p v-if="item.status === 'resolved' && item.resolution_note" class="bk-annot-res-note">
                处理说明：{{ item.resolution_note }}
              </p>

              <!-- 追评列表 -->
              <div v-if="item.replies.length" class="bk-annot-replies">
                <div v-for="rep in item.replies" :key="rep.id" class="bk-annot-reply">
                  <div class="bk-annot-reply-head">
                    <span class="bk-annot-author">{{ rep.author_name }}</span>
                    <span v-if="rep.is_maintainer" class="bk-annot-badge maintainer">维护者</span>
                    <span class="bk-annot-time">{{ formatTime(rep.created_at) }}</span>
                    <button
                      v-if="replyDeleteTokens[rep.id]"
                      type="button"
                      class="bk-annot-del-btn"
                      :disabled="deletingId === rep.id"
                      @click="deleteReply(item.id, rep.id)"
                    >
                      {{ confirmDeleteReplyId === rep.id ? '确认删除？' : '删除' }}
                    </button>
                  </div>
                  <p class="bk-annot-reply-body">{{ rep.body }}</p>
                </div>
              </div>

              <div class="bk-annot-card-actions">
                <button
                  type="button"
                  class="bk-annot-link-btn"
                  @click="openReplyForId = openReplyForId === item.id ? null : item.id; replyError = ''"
                >
                  {{ openReplyForId === item.id ? '收起回复' : '补充评论 / 回复' }}
                </button>
                <button
                  v-if="annotDeleteTokens[item.id]"
                  type="button"
                  class="bk-annot-del-btn"
                  :disabled="deletingId === item.id"
                  @click="deleteAnnotation(item.id)"
                >
                  {{ confirmDeleteId === item.id ? '确认删除？' : '删除我的批注' }}
                </button>
              </div>
              <p v-if="deleteError" class="bk-annot-msg err">{{ deleteError }}</p>

              <!-- 回复表单 -->
              <div v-if="openReplyForId === item.id" class="bk-annot-reply-form">
                <textarea
                  v-model="replyText"
                  rows="2"
                  placeholder="补充你的看法或核实结果…"
                ></textarea>
                <div class="bk-annot-row">
                  <input v-model="authorName" type="text" placeholder="称呼（必填）" maxlength="30" />
                  <input v-model="authorEmail" type="email" placeholder="邮箱（选填，不公开）" maxlength="120" />
                </div>
                <p v-if="replyError" class="bk-annot-msg err">{{ replyError }}</p>
                <div class="bk-annot-form-foot">
                  <button
                    type="button"
                    class="bk-annot-btn primary"
                    :disabled="replySubmitting"
                    @click="submitReply(item.id)"
                  >
                    {{ replySubmitting ? '发送中…' : '发送回复' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <!-- 点击虚线进入时，可展开追加一条新批注 -->
          <div v-if="!draftSelection && !showNewFormInExisting" class="bk-annot-more-action">
            <button
              type="button"
              class="bk-annot-link-btn"
              @click="showNewFormInExisting = true"
            >
              + 针对这段内容再提一条修改建议
            </button>
          </div>

          <!-- 提交新批注表单 -->
          <form
            v-if="draftSelection || showNewFormInExisting"
            class="bk-annot-form"
            @submit.prevent="submitAnnotation"
          >
            <input v-model="honeypot" type="text" class="bk-annot-hp" tabindex="-1" autocomplete="off" />

            <label class="bk-annot-field">
              <span>修改建议</span>
              <textarea
                v-model="suggestionText"
                rows="3"
                placeholder="哪里写得不够准、需要补充例子或纠正事实，直接写下来…"
              ></textarea>
            </label>

            <div class="bk-annot-row">
              <label class="bk-annot-field">
                <span>称呼（必填）</span>
                <input v-model="authorName" type="text" placeholder="如：阿杰 / 前端小王" maxlength="30" />
              </label>
              <label class="bk-annot-field">
                <span>邮箱（选填，不公开）</span>
                <input v-model="authorEmail" type="email" placeholder="仅用于采纳后反馈" maxlength="120" />
              </label>
            </div>

            <p v-if="submitError" class="bk-annot-msg err">{{ submitError }}</p>

            <div class="bk-annot-form-foot">
              <button type="button" class="bk-annot-btn ghost" @click="closePopover">取消</button>
              <button type="submit" class="bk-annot-btn primary" :disabled="submitting">
                {{ submitting ? '提交中…' : '提交批注' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>

    <!-- 右侧「本页批注与修订记录」抽屉 -->
    <div v-if="drawerOpen" class="bk-annot-drawer-mask" @click.self="drawerOpen = false">
      <aside class="bk-annot-drawer" role="dialog" aria-label="本页批注记录">
        <header class="bk-annot-drawer-head">
          <div>
            <p class="bk-annot-drawer-kicker">本页协同记录</p>
            <h2 class="bk-annot-drawer-title">批注与修订贡献</h2>
          </div>
          <button type="button" class="bk-annot-close" aria-label="关闭" @click="drawerOpen = false">×</button>
        </header>

        <div class="bk-annot-tabs">
          <button
            type="button"
            class="bk-annot-tab"
            :class="{ active: drawerTab === 'open' }"
            @click="drawerTab = 'open'"
          >
            待处理（{{ openAnnotations.length }}）
          </button>
          <button
            type="button"
            class="bk-annot-tab"
            :class="{ active: drawerTab === 'resolved' }"
            @click="drawerTab = 'resolved'"
          >
            已采纳修订（{{ resolvedAnnotations.length }}）
          </button>
        </div>

        <div class="bk-annot-drawer-body">
          <template v-if="drawerTab === 'open'">
            <p v-if="!openAnnotations.length" class="bk-annot-empty">
              这一页目前没有待处理的批注。开启右下角「批注模式」并划词，就能直接提出修改建议。
            </p>
            <article
              v-for="item in openAnnotations"
              :key="item.id"
              class="bk-annot-drawer-card"
              @click="jumpToAnnotation(item)"
            >
              <div class="bk-annot-card-meta">
                <span class="bk-annot-author">{{ item.author_name }}</span>
                <span class="bk-annot-badge open">待处理</span>
                <span class="bk-annot-time">{{ formatTime(item.created_at) }}</span>
              </div>
              <p class="bk-annot-drawer-quote">「{{ item.quote_text }}」</p>
              <p class="bk-annot-card-text">{{ item.suggestion }}</p>
              <div class="bk-annot-drawer-foot">
                <span class="bk-annot-drawer-hint">
                  {{ item.replies.length ? `${item.replies.length} 条回复 · ` : '' }}点击定位到原文
                </span>
                <button
                  v-if="annotDeleteTokens[item.id]"
                  type="button"
                  class="bk-annot-del-btn"
                  :disabled="deletingId === item.id"
                  @click.stop="deleteAnnotation(item.id)"
                >
                  {{ confirmDeleteId === item.id ? '确认删除？' : '删除' }}
                </button>
              </div>
            </article>
          </template>

          <template v-else>
            <p v-if="!resolvedAnnotations.length" class="bk-annot-empty">
              这一页还没有已采纳的修订记录。
            </p>
            <article
              v-for="item in resolvedAnnotations"
              :key="item.id"
              class="bk-annot-drawer-card resolved"
            >
              <div class="bk-annot-card-meta">
                <span class="bk-annot-author">感谢 {{ item.author_name }}</span>
                <span class="bk-annot-badge resolved">已采纳</span>
                <span class="bk-annot-time">{{ formatTime(item.updated_at) }}</span>
              </div>
              <p class="bk-annot-drawer-quote">原句：「{{ item.quote_text }}」</p>
              <p class="bk-annot-card-text">{{ item.suggestion }}</p>
              <p v-if="item.resolution_note" class="bk-annot-res-note">
                修订说明：{{ item.resolution_note }}
              </p>
              <div v-if="annotDeleteTokens[item.id]" class="bk-annot-drawer-foot">
                <span></span>
                <button
                  type="button"
                  class="bk-annot-del-btn"
                  :disabled="deletingId === item.id"
                  @click.stop="deleteAnnotation(item.id)"
                >
                  {{ confirmDeleteId === item.id ? '确认删除？' : '删除' }}
                </button>
              </div>
            </article>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.bk-annot-banner {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 44;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--bk-accent);
  background: var(--vp-c-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: var(--vp-c-text-1);
  max-width: calc(100vw - 24px);
}
.bk-annot-banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bk-green);
  flex: none;
}
.bk-annot-banner-exit {
  border: none;
  background: var(--bk-accent-soft);
  color: var(--bk-accent);
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  cursor: pointer;
  flex: none;
}

.bk-annot-dock {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bk-annot-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.bk-annot-pill:hover {
  border-color: var(--bk-accent);
  transform: translateY(-1px);
}
.bk-annot-pill.active {
  background: var(--bk-accent);
  border-color: var(--bk-accent);
  color: #fff;
}
.bk-annot-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bk-accent);
}
.bk-annot-pill.active .bk-annot-pill-dot {
  background: #fff;
}
.bk-annot-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
}
.bk-annot-count.has {
  background: var(--bk-accent-soft);
  color: var(--bk-accent);
}

.bk-annot-toast {
  position: fixed;
  right: 20px;
  bottom: 66px;
  z-index: 46;
  padding: 8px 14px;
  border-radius: 10px;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-size: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.bk-annot-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.14);
}
.bk-annot-popover {
  position: fixed;
  width: min(410px, calc(100vw - 24px));
  max-height: min(76vh, 620px);
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.bk-annot-pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.bk-annot-pop-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.bk-annot-close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 2px 6px;
}
.bk-annot-pop-body {
  padding: 14px 16px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bk-annot-quote-box {
  padding: 9px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--bk-accent);
  background: var(--vp-c-bg-soft);
}
.bk-annot-quote-label {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.bk-annot-quote-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  word-break: break-word;
}
.bk-annot-section-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
}
.bk-annot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bk-annot-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.bk-annot-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.bk-annot-author {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.bk-annot-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.bk-annot-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--bk-accent-soft);
  color: var(--bk-accent);
}
.bk-annot-badge.resolved {
  background: var(--bk-green-soft);
  color: var(--bk-green);
}
.bk-annot-badge.maintainer {
  background: var(--bk-accent);
  color: #fff;
}
.bk-annot-card-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}
.bk-annot-res-note {
  margin: 6px 0 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--bk-green-soft);
  color: var(--bk-green);
  font-size: 12px;
  line-height: 1.5;
}
.bk-annot-replies {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bk-annot-reply-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.bk-annot-reply-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
}
.bk-annot-card-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.bk-annot-del-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  color: #dc2626;
  cursor: pointer;
}
.bk-annot-del-btn:hover {
  text-decoration: underline;
}
.bk-annot-del-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bk-annot-drawer-foot {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.bk-annot-link-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  color: var(--bk-accent);
  cursor: pointer;
}
.bk-annot-link-btn:hover {
  text-decoration: underline;
}
.bk-annot-more-action {
  padding-top: 2px;
}
.bk-annot-form,
.bk-annot-reply-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bk-annot-reply-form {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}
.bk-annot-hp {
  position: absolute;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
}
.bk-annot-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.bk-annot-field span {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.bk-annot-field textarea,
.bk-annot-field input,
.bk-annot-reply-form textarea,
.bk-annot-reply-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
}
.bk-annot-field textarea:focus,
.bk-annot-field input:focus,
.bk-annot-reply-form textarea:focus,
.bk-annot-reply-form input:focus {
  outline: none;
  border-color: var(--bk-accent);
}
.bk-annot-row {
  display: flex;
  gap: 8px;
}
.bk-annot-form-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.bk-annot-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.bk-annot-btn.primary {
  background: var(--bk-accent);
  border-color: var(--bk-accent);
  color: #fff;
}
.bk-annot-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.bk-annot-msg {
  margin: 0;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
}
.bk-annot-msg.err {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}
.bk-annot-msg.ok {
  background: var(--bk-green-soft);
  color: var(--bk-green);
}

/* 右侧抽屉 */
.bk-annot-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 65;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: flex-end;
}
.bk-annot-drawer {
  width: min(440px, 100vw);
  height: 100%;
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
}
.bk-annot-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.bk-annot-drawer-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--bk-accent);
}
.bk-annot-drawer-title {
  margin: 4px 0 0;
  font-family: var(--bk-serif);
  font-size: 20px;
  color: var(--vp-c-text-1);
}
.bk-annot-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.bk-annot-tab {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.bk-annot-tab.active {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-1);
  font-weight: 500;
}
.bk-annot-drawer-body {
  padding: 16px 20px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bk-annot-empty {
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--vp-c-text-3);
}
.bk-annot-drawer-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  transition: border-color 0.2s;
}
.bk-annot-drawer-card:hover {
  border-color: var(--bk-accent);
}
.bk-annot-drawer-card.resolved {
  cursor: default;
}
.bk-annot-drawer-card.resolved:hover {
  border-color: var(--vp-c-divider);
}
.bk-annot-drawer-quote {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  line-height: 1.5;
}
.bk-annot-drawer-hint {
  margin: 0;
  font-size: 11px;
  color: var(--bk-accent);
}

@media (max-width: 640px) {
  .bk-annot-dock {
    right: 12px;
    bottom: 14px;
  }
  .bk-annot-banner {
    top: auto;
    bottom: 62px;
    font-size: 11px;
  }
  .bk-annot-popover {
    left: 0 !important;
    right: 0;
    top: auto !important;
    bottom: 0;
    width: 100%;
    max-height: 82vh;
    border-radius: 16px 16px 0 0;
  }
  .bk-annot-row {
    flex-direction: column;
  }
}
</style>
