/**
 * Quick mobile layout smoke — run: node scripts/saas-mobile-smoke.js
 * Requires: npx playwright install chromium (once)
 */
import { chromium } from 'playwright'

const BASE = process.env.SAAS_URL || 'https://app.assps.edu.pk'
const VIEWPORTS = [
  { w: 375, h: 667, name: 'iPhone SE' },
  { w: 390, h: 844, name: 'iPhone 12' },
  { w: 414, h: 896, name: 'iPhone 11' },
  { w: 430, h: 932, name: 'iPhone 14 Pro Max' },
  { w: 768, h: 1024, name: 'iPad' },
]

const PATHS = ['/dashboard', '/students', '/attendance', '/fees', '/fees/create']

async function checkPage(page, path, vp) {
  const url = `${BASE}${path}`
  const errors = []
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    if (!res || res.status() >= 500) errors.push(`HTTP ${res?.status()}`)
    await page.waitForTimeout(1500)
    const blank = await page.evaluate(() => {
      const root = document.getElementById('root')
      return !root || root.innerText.trim().length < 8
    })
    if (blank) errors.push('blank root')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
    if (overflow) errors.push('horizontal overflow')
    return errors.length ? errors.join(', ') : 'OK'
  } catch (e) {
    return e.message?.slice(0, 80) || 'fail'
  }
}

const browser = await chromium.launch({ headless: true })
let fails = 0
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  const page = await context.newPage()
  for (const path of PATHS) {
    const r = await checkPage(page, path, vp)
    if (r !== 'OK') {
      console.log(`FAIL ${vp.name} ${path}: ${r}`)
      fails++
    } else {
      console.log(`OK   ${vp.name} ${path}`)
    }
  }
  await context.close()
}
await browser.close()
console.log(fails ? `\n${fails} issue(s)` : '\nAll checks passed')
process.exit(fails ? 1 : 0)
