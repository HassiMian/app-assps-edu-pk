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
const PORT = 5197
const BASE_URL = `http://localhost:${PORT}/b3-test.html?mode=canonical-english`

let server
let browser
let page

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => fs.existsSync(candidate))

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
  const context = await browser.newContext({ viewport: { width: 1500, height: 1050 } })
  page = await context.newPage()
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 12000 })
  await page.waitForSelector('.canonical-editable-field .ProseMirror', { timeout: 12000 })
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

async function selectFirstWordIn(locator) {
  await locator.click()
  return locator.evaluate((pm) => {
    const walker = document.createTreeWalker(pm, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && !String(node.textContent || '').trim()) node = walker.nextNode()
    if (!node) throw new Error('No text node found in editor')
    const text = String(node.textContent || '')
    const match = text.match(/[A-Za-z0-9]+/)
    if (!match) throw new Error('No selectable word found')
    const start = match.index
    const end = start + match[0].length
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    return match[0]
  })
}

test('ADV-01: selection survives toolbar focus and Bold plus Italic stay on the selected word', async () => {
  const field = page.locator('.canonical-editable-field .ProseMirror').first()
  const word = await selectFirstWordIn(field)

  const sizeSelect = page.locator('select[aria-label="Font Size"]')
  await sizeSelect.focus()
  await sizeSelect.selectOption('18')

  await page.locator('button[title="Bold"]').click()
  await page.locator('button[title="Italic"]').click()

  const state = await field.evaluate((pm, expected) => {
    const strong = Array.from(pm.querySelectorAll('strong')).find(el => el.textContent === expected)
    const italic = Array.from(pm.querySelectorAll('em')).find(el => el.textContent === expected)
    const sized = Array.from(pm.querySelectorAll('span')).find(el => el.textContent === expected && el.style.fontSize)
    return {
      strong: strong?.textContent || null,
      italic: italic?.textContent || null,
      size: sized?.style?.fontSize || null,
      fullText: pm.textContent,
    }
  }, word)

  assert.equal(state.strong, word, 'Bold must remain scoped to the saved selection')
  assert.equal(state.italic, word, 'Italic must remain scoped to the same saved selection')
  assert.equal(state.size, '18pt', 'Font size must survive toolbar focus transfer')
  assert.ok(state.fullText.length > word.length, 'The rest of the question must remain present')
})

test('ADV-02: active question changes do not leak formatting into the previous field', async () => {
  const fields = page.locator('.canonical-editable-field .ProseMirror')
  assert.ok(await fields.count() >= 2, 'Need at least two editable questions')
  const first = fields.nth(0)
  const second = fields.nth(1)
  const beforeFirst = await first.innerHTML()
  const word = await selectFirstWordIn(second)
  await page.locator('button[title="Underline"]').click()

  const underlined = await second.locator('u').filter({ hasText: word }).count()
  assert.ok(underlined > 0, 'Underline must apply to the newly active field')
  assert.equal(await first.innerHTML(), beforeFirst, 'Previous field must not receive leaked formatting')
})

test('ADV-03: short questions switch between columns and real table layouts without affecting other node types', async () => {
  const shortNode = page.locator('[data-node-type="short_question"]').first()
  assert.ok(await shortNode.count(), 'Canonical English paper must contain short questions')
  await shortNode.locator('.canonical-editable-field .ProseMirror').click()

  const section = shortNode.locator('xpath=ancestor::*[@data-canonical-section][1]')
  const layout = page.locator('#toolbar-short-layout-select')

  await layout.selectOption('2-column-balanced')
  assert.equal(await section.locator('.canonical-section-nodes').getAttribute('data-short-layout'), '2-column-balanced')
  let grid = await section.locator('.canonical-section-nodes').evaluate(el => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
  }))
  assert.equal(grid.display, 'grid')
  assert.equal(grid.columns, 2, 'Two-column mode must create two grid tracks')

  await layout.selectOption('3-column-balanced')
  assert.equal(await section.locator('.canonical-section-nodes').getAttribute('data-short-layout'), '3-column-balanced')
  grid = await section.locator('.canonical-section-nodes').evaluate(el => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
  }))
  assert.equal(grid.display, 'grid')
  assert.equal(grid.columns, 3, 'Three-column mode must create three grid tracks')

  await layout.selectOption('table')
  assert.equal(await section.locator('.canonical-section-nodes').getAttribute('data-short-layout'), 'table')
  const tableState = await shortNode.evaluate(el => ({
    borderStyle: getComputedStyle(el).borderTopStyle,
    borderWidth: getComputedStyle(el).borderTopWidth,
  }))
  assert.notEqual(tableState.borderStyle, 'none', 'Table mode must draw a real cell border')
  assert.notEqual(tableState.borderWidth, '0px', 'Table mode border must be visible')

  await layout.selectOption('table-3-column')
  grid = await section.locator('.canonical-section-nodes').evaluate(el => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
  }))
  assert.equal(grid.display, 'grid')
  assert.equal(grid.columns, 3, 'Table 3-column mode must create three grid tracks')
  const table3Border = await shortNode.evaluate(el => getComputedStyle(el).borderTopStyle)
  assert.notEqual(table3Border, 'none', 'Table 3-column mode must preserve cell borders')

  await layout.selectOption('table-1-column')
  grid = await section.locator('.canonical-section-nodes').evaluate(el => ({
    display: getComputedStyle(el).display,
    columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
  }))
  assert.equal(grid.display, 'grid')
  assert.equal(grid.columns, 1, 'Table 1-column mode must create one grid track')

  const nonShort = section.locator('.canonical-section-nodes > [data-node-type]:not([data-node-type="short_question"]):not([data-node-type="short"])').first()
  if (await nonShort.count()) {
    const span = await nonShort.evaluate(el => getComputedStyle(el).gridColumn)
    assert.ok(span.includes('1') && span.includes('-1'), 'Non-short nodes must span the full section width')
  }
})


test('ADV-04: toolbar focus race cannot collapse and lose a highlighted text range', async () => {
  const field = page.locator('.canonical-editable-field .ProseMirror').first()
  const word = await selectFirstWordIn(field)
  const sizeSelect = page.locator('select[aria-label="Font Size"]')

  // Capture the real range exactly as the toolbar does, then imitate the browser
  // collapsing DOM selection while focus transfers to a native select control.
  await sizeSelect.dispatchEvent('pointerdown')
  await field.evaluate((pm) => {
    const sel = window.getSelection()
    if (!sel || !pm.firstChild) return
    const range = document.createRange()
    range.selectNodeContents(pm)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
  })
  await sizeSelect.focus()
  await sizeSelect.selectOption('20')

  const state = await field.evaluate((pm, expected) => {
    const sized = Array.from(pm.querySelectorAll('span')).find(el => el.textContent === expected && el.style.fontSize)
    return {
      sizedText: sized?.textContent || null,
      size: sized?.style?.fontSize || null,
      fullText: pm.textContent,
    }
  }, word)

  assert.equal(state.sizedText, word, 'The original highlighted word must remain the formatting target')
  assert.equal(state.size, '20pt', 'Formatting must apply to the preserved range after focus transfer')
  assert.ok(state.fullText.length > word.length, 'Formatting must not replace or truncate the rest of the question')
})
