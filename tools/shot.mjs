import puppeteer from "puppeteer-core"
import { mkdirSync } from "node:fs"

// 截图落到仓库根目录的 shots/（已加入 .gitignore）。默认连本机 dev server（vitepress dev 的 5173）。
const OUT = new URL("../shots/", import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const target = process.argv[2] || "http://127.0.0.1:5173"
const dark = process.argv[3] === "dark"

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
})

/** 用元素范围截一块页面，避免整页图过长。toNth 用于取同一选择器的第 n 个元素。 */
async function shoot(page, path, name, fromSelector, toSelector, toNth = 0) {
  await page.goto(target + path, { waitUntil: "networkidle0", timeout: 30000 })
  if (!dark) {
    await page.evaluate(() => localStorage.setItem("vitepress-theme-appearance", "light"))
    await page.reload({ waitUntil: "networkidle0" })
  } else {
    await page.evaluate(() => document.documentElement.classList.add("dark"))
  }
  await new Promise(r => setTimeout(r, 400))
  const clip = await page.evaluate(([fromSel, toSel, nth]) => {
    const from = document.querySelector(fromSel)
    const to = document.querySelectorAll(toSel)[nth]
    if (!from || !to) return null
    const a = from.getBoundingClientRect()
    const b = to.getBoundingClientRect()
    return {
      x: 0,
      y: Math.max(0, a.top + window.scrollY - 28),
      width: document.documentElement.clientWidth,
      height: Math.min(1900, b.bottom - a.top + 56),
    }
  }, [fromSelector, toSelector, toNth])
  if (!clip) throw new Error("selector not found for " + path)
  await page.screenshot({ path: OUT + "/" + name + (dark ? "-dark" : "-light") + ".png", clip })
  console.log("shot", name)
}

const page = await browser.newPage()
await page.setViewport({ width: 1180, height: 1000, deviceScaleFactor: 2 })

await shoot(page, "/ai/02-brief", "chat-brief", "h2#完整例子：从一句话到两步接力", ".prompt-versions")
await shoot(page, "/engineering/05-postmortem", "chat-postmortem", "h2#复盘怎么写", ".chat-msg")
await shoot(page, "/foundations/01-ask", "chat-ask", "h2#常见的样子", ".prompt-versions")

await browser.close()
