// 检查 docs 下全部 Markdown 的外部链接。
// 用法：
//   node tools/check-links.mjs
//   HTTPS_PROXY=http://127.0.0.1:7890 node tools/check-links.mjs    # 走系统代理
// 系统代理开着但命令行不走代理时，会误报一批打不开的站点。先在浏览器里确认，再决定改不改。
// 检查结果只留在这里和提交信息里：docs/ 是对外的正文，不写核验过程、不列待确认清单。
// 退出码非 0 表示有链接需要人工确认。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'

const root = new URL('../docs/', import.meta.url).pathname
const files = []
const walk = (d) => { for (const n of readdirSync(d)) { if (n.startsWith('.')) continue; const p = join(d, n); statSync(p).isDirectory() ? walk(p) : n.endsWith('.md') && files.push(p) } }
walk(root)

const urls = new Map()
for (const f of files) {
  const text = readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '')
  for (const m of text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    const u = m[1]
    if (!urls.has(u)) urls.set(u, [])
    urls.get(u).push(f.slice(root.length))
  }
}

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || ''
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const check = (u) => new Promise((resolve) => {
  const args = ['-s', '-L', '-m', '30', '-A', UA, '-H', 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8', '-o', '/dev/null', '-w', '%{http_code}', u]
  if (proxy) args.unshift('-x', proxy)
  execFile('curl', args, { timeout: 40000 }, (err, stdout) => {
    const code = (stdout || '').trim()
    if (code) return resolve(code)
    resolve('ERR ' + (err && (err.killed ? 'timeout' : 'failed')))
  })
})

// 并发压低到 3：部分站点会限制短时间内的连续请求，并发高时会误报超时。
const list = [...urls.keys()]
const bad = []
let i = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < list.length) {
    const u = list[i++]
    let s = await check(u)
    if (s !== '200') { await sleep(2000); s = await check(u) }
    if (s !== '200') bad.push([s, u])
  }
}))
console.log('files', files.length, 'external links', list.length, 'proxy', proxy || 'direct', 'not-200', bad.length)
for (const [s, u] of bad.sort()) console.log(String(s).padEnd(16), u, ' <- ', [...new Set(urls.get(u))].join(', '))
process.exit(bad.length ? 1 : 0)