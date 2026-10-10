import process from 'node:process'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '../../../../..')
const v13Path = path.resolve(__dirname, '../../seed-data/official-first-term-2026-v13.json')
const v13 = JSON.parse(fs.readFileSync(v13Path, 'utf8'))

const PORT = Number(process.env.ASSPS_CANARY_BROWSER_PORT || 5196)
const BASE_URL = `http://localhost:${PORT}/canonical-canary-test.html`

let server
let browser
let page
let pageErrors = []
let consoleErrors = []

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => candidate && fs.existsSync(candidate))

before(async () => {
  server = await createServer({
    root: frontendRoot,
    server: { port: PORT, strictPort: true },
  })
  await server.listen()

  browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  await context.addInitScript(() => {
    localStorage.setItem('al_siddique_token', 'canary-test-only-token')
    localStorage.setItem('al_siddique_user', JSON.stringify({
      id: 999,
      school_id: 1,
      name: 'Canary Test Admin',
      role: 'admin',
      school_name: 'Al Siddique Scholars Public School',
      schoolCode: 'ASSPS',
    }))
  })
  page = await context.newPage()

  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/**', route => {
    const isSession = route.request().url().includes('/api/auth/me')
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSession
        ? { success: true, user: { id: 999, school_id: 1, name: 'Canary Test Admin', role: 'admin' } }
        : { success: true, data: {} }),
    })
  })

  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const locationUrl = message.location()?.url || ''
    if (locationUrl.endsWith('/favicon.ico')) return
    consoleErrors.push(locationUrl ? `${locationUrl}: ${message.text()}` : message.text())
  })
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

async function openSavedPapers() {
  const savedButton = page.getByRole('button', { name: 'Saved Papers' })
  await savedButton.waitFor({ timeout: 10000 })
  await savedButton.click()
  await page.getByPlaceholder(' Search papers...').waitFor({ timeout: 10000 })
}

async function loadSavedPaper(paper) {
  const search = page.getByPlaceholder(' Search papers...')
  await search.fill(paper.name)
  await page.waitForTimeout(80)

  const exactName = page.getByText(paper.name, { exact: true })
  await exactName.waitFor({ timeout: 10000 })

  const loadButton = page.getByRole('button', { name: 'Open in Workspace' }).first()
  await loadButton.click()
}

test('Teacher-facing Studio shell: creation paths and specialist routing', async () => {
  await page.goto(`http://localhost:${PORT}/ey-test.html?mode=generator`, { waitUntil:'domcontentloaded' })
  await page.locator('[data-create-paper-home]').waitFor({ timeout:15000 })
  assert.equal(await page.getByRole('heading', { name:'Paper Studio' }).count(), 1)
  assert.equal(await page.locator('[data-creation-option]').count(), 4)
  assert.equal(await page.locator('.paper-generator-module-tabs button').count(), 6)
  await page.locator('[data-creation-option="early_years"]').click()
  await page.locator('.early-years-module-wrap').waitFor({ timeout:12000 })
  assert.equal(await page.getByRole('button', { name:'Pre Classes Papers' }).getAttribute('aria-current'), 'page')
  await page.getByRole('button', { name:'Saved Papers' }).click()
  await page.getByPlaceholder(' Search papers...').waitFor({ timeout:12000 })
  await page.getByRole('button', { name:'Paper Workspace' }).click()
  await page.locator('[data-create-paper-home]').waitFor({ timeout:12000 })
})

test('Phase 18: Saved Papers opens all 43 official V13 papers in the unified Paper Workspace', async () => {
  assert.strictEqual(v13.papers.length, 43)

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await openSavedPapers()

  const failures = []
  let canonicalCount = 0

  for (const [index, paper] of v13.papers.entries()) {
    pageErrors = []
    consoleErrors = []

    try {
      await loadSavedPaper(paper)
      await page.waitForSelector('[data-paper-style-root]', { timeout: 12000 })
      await page.waitForSelector('.pts-generator-surface', { timeout: 12000 })

      const canonicalSurface = page.locator('[data-paper-style-root]').first()
      const renderedText = await canonicalSurface.innerText()
      assert.ok(renderedText.length > 0, `${paper.id}: canonical paper text is empty`)
      assert.ok(!renderedText.includes('[object Object]'), `${paper.id}: leaked [object Object]`)
      assert.ok(!renderedText.includes('undefined'), `${paper.id}: leaked undefined`)
      assert.ok(!renderedText.includes('NaN'), `${paper.id}: leaked NaN`)

      const legacySurfaceCount = await page.locator('.paper-editor-v2-root').count()
      assert.strictEqual(legacySurfaceCount, 0, `${paper.id}: legacy editor rendered during canonical canary`)

      assert.deepStrictEqual(pageErrors, [], `${paper.id}: page errors: ${pageErrors.join(' | ')}`)
      assert.deepStrictEqual(consoleErrors, [], `${paper.id}: console errors: ${consoleErrors.join(' | ')}`)

      canonicalCount += 1
      console.log(`PHASE18 ${index + 1}/43 PASS ${paper.id}`)

      await openSavedPapers()
    } catch (error) {
      failures.push({ paperId: paper.id, message: error.message })
      console.log(`PHASE18 ${index + 1}/43 FAIL ${paper.id}: ${error.message}`)
      try {
        await openSavedPapers()
      } catch { /* Expected optional probe failure; the assertion after this block remains authoritative. */ }
    }
  }

  assert.deepStrictEqual(failures, [], JSON.stringify(failures, null, 2))
  assert.strictEqual(canonicalCount, 43)
})

test('Phase 18: legacy query flag cannot reopen retired editor for official papers', async () => {
  const sample = v13.papers.find(paper => paper.id === 'official-first-term-2026-class-5-english')
  assert.ok(sample)

  await page.goto(`${BASE_URL}?canonicalLegacy=1`, { waitUntil: 'domcontentloaded' })
  await openSavedPapers()
  await loadSavedPaper(sample)

  await page.waitForSelector('[data-paper-style-root]', { timeout: 12000 })
  assert.ok(await page.locator('.pts-generator-surface').count() > 0)
  assert.strictEqual(await page.locator('.paper-editor-v2-root').count(), 0)
})
