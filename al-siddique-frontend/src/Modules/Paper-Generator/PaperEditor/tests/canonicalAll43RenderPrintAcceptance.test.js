import { test, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '../../../../..')
const corpusPath = path.resolve(__dirname, '../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8')).documents

const PORT = 5194
const BASE_URL = `http://localhost:${PORT}/b3-test.html`

let server
let browser
let page
let pageErrors = []
let consoleErrors = []

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => fs.existsSync(candidate))

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}

function isUrduDocument(doc) {
  const language = String(doc.metadata?.language || doc.presentation?.language || '').toLowerCase()
  const subject = String(doc.metadata?.subject || '').toLowerCase()
  return language === 'urdu' ||
    subject.includes('urdu') ||
    subject.includes('islam') ||
    subject.includes('pak') ||
    subject.includes('quran') ||
    subject.includes('tarjuma')
}
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

  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  page = await context.newPage()
  await page.route('**/favicon.ico', async route => {
    await route.fulfill({ status: 204, body: '' })
  })
  await page.route('**/api/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const locationUrl = message.location()?.url || ''
    // Browsers can emit a delayed favicon 404 from the previous navigation after
    // the next paper has already reset its error bucket. Favicon is not a paper asset.
    if (locationUrl.endsWith('/favicon.ico')) return
    consoleErrors.push(locationUrl ? `${locationUrl}: ${message.text()}` : message.text())
  })
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

test('Phase 14: all 43 canonical papers preserve render structure and print text parity', async () => {
  assert.strictEqual(corpus.length, 43)
  const requestedStart = Math.max(1, Number.parseInt(process.env.PHASE14_START || '1', 10) || 1)
  const requestedEnd = Math.min(corpus.length, Number.parseInt(process.env.PHASE14_END || String(corpus.length), 10) || corpus.length)
  assert.ok(requestedStart <= requestedEnd, `Invalid PHASE14 range ${requestedStart}-${requestedEnd}`)
  const selectedCorpus = corpus
    .map((doc, paperIndex) => ({ doc, paperIndex }))
    .slice(requestedStart - 1, requestedEnd)
  const expectedSelectedSections = selectedCorpus.reduce((sum, entry) => sum + (entry.doc.sections?.length || 0), 0)

  const failures = []
  const stats = {
    papers: 0,
    sections: 0,
    nodes: 0,
    urduPapers: 0,
  }

  for (const { doc, paperIndex } of selectedCorpus) {
    console.log(`PHASE14 ${paperIndex + 1}/${corpus.length} START ${doc.id}`)
    pageErrors = []
    consoleErrors = []
    await page.emulateMedia({ media: 'screen' })
    await page.goto(`${BASE_URL}?mode=${encodeURIComponent(doc.id)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    try {
      await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })
      await page.waitForSelector('[data-canonical-working-document]', { timeout: 10000 })

      const expectedSections = doc.sections?.length || 0
      const expectedNodes = (doc.sections || []).reduce((sum, section) => sum + (section.nodes?.length || 0), 0)
      const renderedSections = await page.locator('[data-canonical-section]').count()
      const renderedNodes = await page.locator('.canonical-section-nodes > [data-node-id]').count()

      assert.strictEqual(renderedSections, expectedSections, `${doc.id}: section count mismatch`)
      assert.strictEqual(renderedNodes, expectedNodes, `${doc.id}: top-level node count mismatch`)

      const article = page.locator('[data-canonical-working-document]').first()
      const screenDir = await article.getAttribute('dir')
      const screenOverflow = await article.evaluate(element => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }))
      assert.ok(
        screenOverflow.scrollWidth <= screenOverflow.clientWidth + 2,
        `${doc.id}: horizontal overflow ${screenOverflow.scrollWidth} > ${screenOverflow.clientWidth}`
      )

      const editingButton = page.getByRole('button', { name: 'Done Editing' })
      if (await editingButton.count()) {
        await editingButton.click()
      }

      const screenText = normalizeText(await article.innerText())
      assert.ok(screenText.length > 0, `${doc.id}: empty static paper text`)
      assert.ok(!screenText.includes('[object Object]'), `${doc.id}: leaked [object Object]`)
      assert.ok(!screenText.includes('undefined'), `${doc.id}: leaked undefined`)
      assert.ok(!screenText.includes('NaN'), `${doc.id}: leaked NaN`)

      if (isUrduDocument(doc)) {
        stats.urduPapers++
        assert.strictEqual(screenDir, 'rtl', `${doc.id}: Urdu paper must render RTL`)
        const fontFamily = await article.evaluate(element => getComputedStyle(element).fontFamily)
        assert.ok(
          /Jameel|Nastaliq|Urdu Typesetting/i.test(fontFamily),
          `${doc.id}: Urdu font stack missing: ${fontFamily}`
        )
      }

      await page.emulateMedia({ media: 'print' })
      const printText = normalizeText(await article.innerText())
      assert.strictEqual(printText, screenText, `${doc.id}: print text differs from static screen text`)

      const printOverflow = await article.evaluate(element => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }))
      assert.ok(
        printOverflow.scrollWidth <= printOverflow.clientWidth + 2,
        `${doc.id}: print horizontal overflow ${printOverflow.scrollWidth} > ${printOverflow.clientWidth}`
      )

      assert.deepStrictEqual(pageErrors, [], `${doc.id}: page errors: ${pageErrors.join(' | ')}`)
      assert.deepStrictEqual(consoleErrors, [], `${doc.id}: console errors: ${consoleErrors.join(' | ')}`)

      stats.papers++
      stats.sections += expectedSections
      stats.nodes += expectedNodes
      console.log(`PHASE14 ${paperIndex + 1}/${corpus.length} PASS ${doc.id}`)
    } catch (error) {
      failures.push({ paperId: doc.id, message: error.message })
      console.log(`PHASE14 ${paperIndex + 1}/${corpus.length} FAIL ${doc.id}: ${error.message}`)
    }
  }

  assert.deepStrictEqual(failures, [], JSON.stringify(failures, null, 2))
  assert.strictEqual(stats.papers, selectedCorpus.length)
  assert.strictEqual(stats.sections, expectedSelectedSections)
  assert.ok(stats.nodes > 0)
  if (requestedStart === 1 && requestedEnd === corpus.length) {
    assert.strictEqual(stats.papers, 43)
    assert.strictEqual(stats.sections, 242)
    assert.ok(stats.urduPapers > 0)
  }
  console.log(`PHASE14_RANGE ${requestedStart}-${requestedEnd} PASS ${stats.papers}/${selectedCorpus.length}`)
})
