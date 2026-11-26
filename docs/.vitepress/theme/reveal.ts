// 滚动进入动效：正文里每个直接子元素，进视口时淡入上移。
// 三条原则：
// 1. 没有 JS 时内容默认可见，脚本只负责「藏起来再放出来」，绝不把内容锁死。
// 2. 用户开了「减少动效」就完全不接管，页面保持静态。
// 3. 首屏已经在视口里的元素直接算已经进入，不做藏一下再放出来的闪动。

export function setupReveal(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof IntersectionObserver === 'undefined') return () => {}
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const doc = document.querySelector('.vp-doc')
  if (!doc) return () => {}

  const vh = window.innerHeight || 800
  const all = Array.from(doc.children) as HTMLElement[]
  const targets = all.filter((el) => {
    if (el.tagName === 'H1') return false
    if (el.classList.contains('bk-no-reveal')) return false
    return true
  })
  if (!targets.length) return () => {}

  doc.classList.add('bk-reveal-armed')

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        el.classList.add('bk-in')
        io.unobserve(el)
      }
    },
    { threshold: 0.06, rootMargin: '0px 0px -3% 0px' }
  )

  for (const el of targets) {
    const top = el.getBoundingClientRect().top
    if (top < vh * 0.92) el.classList.add('bk-in')
    else io.observe(el)
  }

  return () => {
    io.disconnect()
    doc.classList.remove('bk-reveal-armed')
  }
}
