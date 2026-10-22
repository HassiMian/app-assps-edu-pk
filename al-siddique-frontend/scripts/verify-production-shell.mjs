/**
 * APEX public shell smoke gate. Run against a candidate preview URL
 * and the live URL before/after a frontend cutover.
 *
 * Detects mixed entry/chunk graphs and browser-level AuthProvider crashes.
 * Safe: anonymous reads only; never writes data or authenticates.
 */
import { chromium } from 'playwright'

const base = (process.env.APEX_BASE_URL || 'https://app.assps.edu.pk').replace(/\/$/, '')
const timeout = 30000
const url = (path) => new URL(path, base).href

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchText(path) {
  const response = await fetch(url(path), {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(timeout),
  })
  assert(response.ok, `HTTP ${response.status}: ${path}`)
  return response.text()
}

async function main() {
  const html = await fetchText('/login')
  const entry = html.match(/<script[^>]*src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/)?.[1]
  assert(entry, 'No immutable main entry found in index HTML')

  const entryJs = await fetchText(entry)
  const loginChunk = entryJs.match(/assets\/LoginPage-[A-Za-z0-9_-]+\.js/)?.[0]
  assert(loginChunk, 'LoginPage lazy chunk not found in entry')
  const loginJs = await fetchText('/' + loginChunk)

  // LoginPage imports providers/hooks from the SAME actual JS entry. Distinct
  // entry hashes instantiate separate React contexts and crash at useAuth().
  const referencedEntryNames = [...loginJs.matchAll(/\.\/index-([A-Za-z0-9_-]+)\.js/g)]
    .map((item) => '/assets/index-' + item[1] + '.js')
  assert(referencedEntryNames.length > 0, 'Unable to verify LoginPage entry reference')
  assert(referencedEntryNames.every((candidate) => candidate === entry),
    `Mixed frontend release graph: HTML loads ${entry} but LoginPage imports ${[...new Set(referencedEntryNames)].join(', ')}`)

  const browser = await chromium.launch({ headless: true, args: ['--disable-quic'], ...(process.env.APEX_CHROME_PATH ? { executablePath: process.env.APEX_CHROME_PATH } : (process.env.CI ? {} : { channel: 'chrome' })) })
  try {
    for (const path of ['/login', '/dashboard']) {
      const context = await browser.newContext({ serviceWorkers: 'block' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error' && /useAuth|AuthProvider|app shell render|Failed to fetch dynamically imported module/i.test(message.text())) {
          errors.push(message.text().slice(0, 300))
        }
      })
      // Cloudflare QUIC transport errors are intermittent; retry only transport
      // errors once, never JS/app-shell errors.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await page.goto(url(path), { waitUntil: 'domcontentloaded', timeout })
          break
        } catch (error) {
          const transient = /ERR_QUIC_PROTOCOL_ERROR|ERR_CONNECTION_RESET|ERR_HTTP2_PROTOCOL_ERROR/.test(String(error?.message))
          if (!transient || attempt === 1) throw error
        }
      }
      await page.locator('input').first().waitFor({ state: 'visible', timeout: 12000 })
      await page.waitForTimeout(500)
      const recoveryCount = await page.getByText('APEX RECOVERY MODE', { exact: false }).count()
      const inputCount = await page.locator('input').count()
      assert(!recoveryCount, `Recovery-mode render crash at ${path}`)
      assert(inputCount >= 2, `Login inputs not visible at ${path}: ${inputCount}`)
      assert(!errors.length, `JavaScript errors at ${path}: ${JSON.stringify(errors)}`)
      console.log(`PASS ${path}: login inputs=${inputCount}, no recovery screen, no app shell errors`)
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(`PASS frontend release consistency: ${entry} matches LoginPage's source entry`)
}

main().catch((error) => {
  console.error('FAIL APEX production-shell smoke gate:', error.message)
  process.exitCode = 1
})
