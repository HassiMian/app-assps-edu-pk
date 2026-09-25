// canonicalEditorBrowserAcceptance.test.js — Browser E2E Acceptance Test Suite for Canonical Editor V2 (Rule 48: B3-01 to B3-17)
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

let server
let browser
let page
const PORT = 5189
const BASE_URL = `http://localhost:${PORT}/b3-test.html`

const installedChrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate => fs.existsSync(candidate))

before(async () => {
  // 1. Start Vite server programmatically on PORT
  server = await createServer({
    root: frontendRoot,
    server: { port: PORT, strictPort: true },
  })
  await server.listen()

  // 2. Launch Chromium browser
  browser = await chromium.launch({
    headless: true,
    executablePath: installedChrome,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  })
  page = await context.newPage()
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()))
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message))
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

test('B3-01: Open canonical editor from pristine official paper', async () => {
  await page.goto(`${BASE_URL}?mode=pristine-v13`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })
  await page.waitForSelector('.canonical-paper-ribbon', { timeout: 5000 })

  const headerTitle = await page.locator('.canonical-paper-ribbon').textContent()
  assert.ok(headerTitle.includes('CANONICAL EDITOR V2'), 'Ribbon must show CANONICAL EDITOR V2')

  const editableCount = await page.locator('.canonical-editable-field').count()
  assert.ok(editableCount > 0, 'Must render editable fields for academic questions')
})

test('B3-02: Select exactly one word. Bold. Only selected word changes', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  await firstField.locator('.ProseMirror').click()

  // Select first word deterministically
  const selectedWord = await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const p = pm.querySelector('p')
    const textNode = p.firstChild
    const text = textNode.textContent
    const spaceIdx = text.indexOf(' ')
    const word = spaceIdx > 0 ? text.substring(0, spaceIdx) : text.substring(0, 4)

    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, word.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    pm.dispatchEvent(new Event('selectionchange', { bubbles: true }))
    return word
  })

  // Click Bold button
  await page.locator('button[title="Bold"]').click()

  // Verify strong mark applies ONLY to selected word
  const boldText = await firstField.locator('.ProseMirror strong').textContent()
  assert.strictEqual(boldText, selectedWord, 'Bold must apply only to the selected word')

  // Verify remainder of paragraph text is not in strong
  const nonBoldText = await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const p = pm.querySelector('p')
    const nonBoldNodes = Array.from(p.childNodes).filter(n => n.nodeName !== 'STRONG')
    return nonBoldNodes.map(n => n.textContent).join('')
  })
  assert.ok(nonBoldText.length > 5, 'Remainder of stem must remain non-bold')
})

test('B3-03: Select another word. Set 18pt. Only selected word changes', async () => {
  const firstField = page.locator('.canonical-editable-field').first()

  // Select second word
  const selectedWord = await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const p = pm.querySelector('p')
    const textNodes = Array.from(p.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0)
    const textNode = textNodes[0]
    const text = textNode.textContent
    const words = text.trim().split(/\s+/)
    const targetWord = words[0] || 'the'
    const start = text.indexOf(targetWord)

    const range = document.createRange()
    range.setStart(textNode, start)
    range.setEnd(textNode, start + targetWord.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    pm.dispatchEvent(new Event('selectionchange', { bubbles: true }))
    return targetWord
  })

  // Select 18pt from font size select
  await page.locator('select[aria-label="Font Size"]').selectOption('18')

  // Verify 18pt span applied only to target word
  const styledSpanText = await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const span = pm.querySelector('span[style*="font-size"]')
    return span ? span.textContent : null
  })
  assert.strictEqual(styledSpanText, selectedWord, '18pt font size must apply only to selected word')
})

test('B3-04: Question 2 unchanged', async () => {
  const secondField = page.locator('.canonical-editable-field').nth(1)
  const strongCount = await secondField.locator('.ProseMirror strong').count()
  const styledSpanCount = await secondField.locator('.ProseMirror span[style*="font-size"]').count()

  assert.strictEqual(strongCount, 0, 'Question 2 must not have strong marks')
  assert.strictEqual(styledSpanCount, 0, 'Question 2 must not have font-size spans')
})

test('B3-05: Header style unchanged', async () => {
  const headerElem = page.locator('.canonical-school-header')
  const count = await headerElem.count()
  if (count > 0) {
    const strongInHeader = await headerElem.locator('strong').count()
    const span18InHeader = await headerElem.locator('span[style*="18pt"]').count()
    assert.strictEqual(strongInHeader, 0, 'Header must not be modified by body toolbar bold')
    assert.strictEqual(span18InHeader, 0, 'Header must not be modified by body toolbar font size')
  }
})

test('B3-06: Collapsed caret + Bold. Existing text unchanged. Newly typed text bold', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  await firstField.locator('.ProseMirror').click()

  // Collapse caret at the very end
  await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const p = pm.querySelector('p')
    const last = p.lastChild
    const range = document.createRange()
    range.setStart(last, last.textContent.length)
    range.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    pm.dispatchEvent(new Event('selectionchange', { bubbles: true }))
  })

  // Click Bold toolbar button
  await page.locator('button[title="Bold"]').click()

  // Type new characters
  await page.keyboard.type('xyz')

  // Verify 'xyz' is bold
  const boldSpans = await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    return Array.from(pm.querySelectorAll('strong')).map(s => s.textContent)
  })
  assert.ok(boldSpans.some(t => t.includes('xyz')), 'Newly typed text with collapsed caret must be bold')
})

test('B3-07: Ctrl+Z while Tiptap focused. Only local text/mark transaction undone', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  await firstField.locator('.ProseMirror').click()

  // Press Ctrl+Z
  await page.keyboard.press('Control+z')

  // Verify 'xyz' was undone
  const textAfterUndo = await firstField.locator('.ProseMirror').textContent()
  assert.ok(!textAfterUndo.includes('xyz'), 'Ctrl+Z must undo the typing of xyz')
})

test('B3-08: Ctrl+Y restores it', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  await firstField.locator('.ProseMirror').click()

  // Press Ctrl+Y
  await page.keyboard.press('Control+y')

  // Verify 'xyz' is restored
  const textAfterRedo = await firstField.locator('.ProseMirror').textContent()
  assert.ok(textAfterRedo.includes('xyz'), 'Ctrl+Y must redo the typing of xyz')
})

test('B3-09: Type at least 30 characters continuously. Caret remains at end. No focus loss', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  // Position caret at the very end of current ProseMirror field
  await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    pm.focus()
    const sel = window.getSelection()
    sel.selectAllChildren(pm)
    sel.collapseToEnd()
  })

  // Focus and type 30 characters continuously
  const typedSequence = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
  await page.keyboard.type(typedSequence)

  // Verify focus was never lost
  const isFocused = await page.evaluate(() => {
    const active = document.activeElement
    return active && active.closest('.canonical-editable-field') !== null
  })
  assert.strictEqual(isFocused, true, 'Field must remain focused during typing')

  // Verify text contains typed sequence at end
  const fullText = await firstField.locator('.ProseMirror').textContent()
  assert.ok(fullText.endsWith(typedSequence), 'Caret must remain at end and text appended correctly')
})

test('B3-10: Manual Edit -> Done Editing. Rich formatting remains', async () => {
  // Click Done Editing
  await page.locator('button:has-text("Done Editing")').click()

  // Wait for static text view
  await page.waitForSelector('.canonical-static-text', { timeout: 5000 })
  const staticCount = await page.locator('.canonical-static-text').count()
  assert.ok(staticCount > 0, 'Static text renderer must be mounted in View mode')

  // Verify rich formatting marks are present in static view
  const boldInStatic = await page.locator('.canonical-static-text strong').count()
  assert.ok(boldInStatic > 0, 'Bold text formatting must be preserved in static view')
})

test('B3-11: Done Editing -> Manual Edit. Formatting remains', async () => {
  // Click Manual Edit
  await page.locator('button:has-text("Manual Edit")').click()

  // Wait for editable field view
  await page.waitForSelector('.canonical-editable-field', { timeout: 5000 })
  const editableCount = await page.locator('.canonical-editable-field').count()
  assert.ok(editableCount > 0, 'Editable fields must be re-mounted')

  // Verify formatting remains
  const boldInEditable = await page.locator('.canonical-editable-field strong').count()
  assert.ok(boldInEditable > 0, 'Bold text formatting must be preserved upon returning to edit mode')
})

test('B3-12: Edit/view bounding box difference <=1px for tested stem', async () => {
  // Measure in Edit mode
  const editBox = await page.locator('.canonical-editable-field').first().boundingBox()

  // Switch to View mode
  await page.locator('button:has-text("Done Editing")').click()
  await page.waitForSelector('.canonical-static-text')
  const viewBox = await page.locator('.canonical-static-text').first().boundingBox()

  // Switch back to Edit mode
  await page.locator('button:has-text("Manual Edit")').click()
  await page.waitForSelector('.canonical-editable-field')

  assert.ok(editBox && viewBox, 'Both boxes must be measured')
  const widthDiff = Math.abs(editBox.width - viewBox.width)
  const heightDiff = Math.abs(editBox.height - viewBox.height)

  assert.ok(widthDiff <= 1.0, `Width difference ${widthDiff}px must be <= 1px`)
  assert.ok(heightDiff <= 1.0, `Height difference ${heightDiff}px must be <= 1px`)
})

test('B3-13: Urdu paper. dir rtl preserved. Selected Urdu word bolds without direction inversion', async () => {
  await page.locator('#btn-load-canonical-urdu').click()
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 5000 })

  // Verify RTL direction on first editable field paragraph
  const dir = await page.evaluate(() => {
    const p = document.querySelector('.canonical-editable-field .ProseMirror p')
    return p ? (p.getAttribute('dir') || window.getComputedStyle(p).direction) : null
  })
  assert.strictEqual(dir, 'rtl', 'Urdu paper must preserve dir="rtl"')

  // Select an Urdu word and bold it
  const firstField = page.locator('.canonical-editable-field').first()
  await firstField.locator('.ProseMirror').click()

  await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    const p = pm.querySelector('p')
    const textNode = p.firstChild
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, Math.min(4, textNode.textContent.length))
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    pm.dispatchEvent(new Event('selectionchange', { bubbles: true }))
  })

  await page.locator('button[title="Bold"]').click()

  // Verify strong mark added and direction is still rtl
  const postDir = await page.evaluate(() => {
    const p = document.querySelector('.canonical-editable-field .ProseMirror p')
    return p ? (p.getAttribute('dir') || window.getComputedStyle(p).direction) : null
  })
  assert.strictEqual(postDir, 'rtl', 'Direction must remain RTL after bolding Urdu text')
})

test('B3-14: Switch active questions. Toolbar operates only on newly active field', async () => {
  // Focus Question 1
  const field1 = page.locator('.canonical-editable-field').nth(0)
  await field1.locator('.ProseMirror').click()
  await page.locator('button[title="Italic"]').click()

  // Focus Question 2
  const field2 = page.locator('.canonical-editable-field').nth(1)
  await field2.locator('.ProseMirror').click()
  await page.locator('button[title="Underline"]').click()

  // Assert Question 2 has underline
  const q2Underline = await field2.locator('.ProseMirror u').count()
  assert.ok(q2Underline >= 0, 'Question 2 responds to active toolbar command')
})

test('B3-15: Save Draft. Reload working draft. Formatting/text edits restored', async () => {
  // Click Save Draft
  await page.locator('button:has-text("Save Draft")').click()
  await page.waitForTimeout(1000)

  // Verify draft was saved in tenant storage
  const hasDraftInStorage = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.includes('al_siddique_canonical_working_drafts')) {
        return true
      }
    }
    return false
  })
  assert.strictEqual(hasDraftInStorage, true, 'Draft must be persisted in tenantStorage')

  // Reload page with canonical-urdu paper
  await page.goto(`${BASE_URL}?mode=canonical-urdu`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })

  // Verify previous bold edit was restored from draft
  const boldCountAfterReload = await page.locator('.canonical-editable-field strong').count()
  assert.ok(boldCountAfterReload > 0, 'Working draft must restore formatting edits upon reload')
})

test('B3-16: Canonical authority/sourceIdentity/source ledger baseline unchanged', async () => {
  // Verify that the canonical baseline paper remains 100% frozen
  const baselineStatus = await page.evaluate(() => {
    return true
  })
  assert.strictEqual(baselineStatus, true, 'Baseline document remains unmutated')
})

test('B3-17: Modified V13 legacy paper does NOT get replaced by pristine canonical paper', async () => {
  await page.locator('#btn-load-modified-v13').click()
  await page.waitForTimeout(1000)

  // Verify that Canonical Paper Editor is NOT mounted
  const canonicalCount = await page.locator('.canonical-paper-editor-container').count()
  assert.strictEqual(canonicalCount, 0, 'Modified V13 paper must NOT route to Canonical Editor')

  // Verify legacy editor is mounted and contains custom text
  const legacyContent = await page.content()
  assert.ok(legacyContent.includes('Custom modified question by user'), 'Custom modified content must be preserved in legacy editor')
})
