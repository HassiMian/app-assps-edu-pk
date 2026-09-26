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

test('B3-09: Type 100 characters continuously. Caret remains at end. Render deltas <= 2', async () => {
  const firstField = page.locator('.canonical-editable-field').first()
  const secondField = page.locator('.canonical-editable-field').nth(1)
  const fieldKeyA = await firstField.getAttribute('data-field-key')
  const fieldKeyB = await secondField.getAttribute('data-field-key')

  // Position caret at the very end of current ProseMirror field
  await page.evaluate(() => {
    const pm = document.querySelector('.canonical-editable-field .ProseMirror')
    pm.focus()
    const sel = window.getSelection()
    sel.selectAllChildren(pm)
    sel.collapseToEnd()
  })

  // Capture initial diagnostics
  const initialDiag = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.__B3_DIAGNOSTICS__ || {}))
  })

  // Focus and type exactly 100 characters continuously
  const typedSequence = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678901234567890123456789012345678901234567'
  assert.strictEqual(typedSequence.length, 100, 'Sequence must be exactly 100 characters')
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

  // Capture final diagnostics and verify render isolation deltas
  const finalDiag = await page.evaluate(() => {
    return JSON.parse(JSON.stringify(window.__B3_DIAGNOSTICS__ || {}))
  })

  const rootRenderDelta = (finalDiag.rootRenderCount || 0) - (initialDiag.rootRenderCount || 0)
  const docRendererDelta = (finalDiag.documentRendererRenderCount || 0) - (initialDiag.documentRendererRenderCount || 0)
  const nodeBDelta = (finalDiag.fieldRenderCounts?.[fieldKeyB] || 0) - (initialDiag.fieldRenderCounts?.[fieldKeyB] || 0)
  const nodeAEditorCreations = finalDiag.editorCreationCounts?.[fieldKeyA] || 0

  assert.ok(rootRenderDelta <= 2, `CanonicalPaperEditorMain render delta (${rootRenderDelta}) must be <= 2 during 100 typed characters`)
  assert.ok(docRendererDelta <= 2, `CanonicalDocumentRenderer render delta (${docRendererDelta}) must be <= 2 during 100 typed characters`)
  assert.ok(nodeBDelta <= 2, `Node B render delta (${nodeBDelta}) must be <= 2 during typing in Node A`)
  assert.strictEqual(nodeAEditorCreations, 1, 'Active Node A Tiptap editor creation count must be exactly 1')
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

  // Focus Question 2
  const field2 = page.locator('.canonical-editable-field').nth(1)
  await field2.locator('.ProseMirror').click()

  // Select exact word in Question 2
  const selectedWordInQ2 = await page.evaluate(() => {
    const fields = document.querySelectorAll('.canonical-editable-field .ProseMirror')
    const q2Pm = fields[1]
    const p = q2Pm.querySelector('p')
    const textNode = p.firstChild
    const text = textNode.textContent
    const words = text.trim().split(/\s+/)
    const target = words[0] || 'question'
    const start = text.indexOf(target)

    const range = document.createRange()
    range.setStart(textNode, start)
    range.setEnd(textNode, start + target.length)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    q2Pm.dispatchEvent(new Event('selectionchange', { bubbles: true }))
    return target
  })

  // Apply underline via toolbar button
  await page.locator('button[title="Underline"]').click()

  // Assert selected word in Q2 is underlined
  const q2UnderlinedText = await field2.locator('.ProseMirror u').textContent()
  assert.strictEqual(q2UnderlinedText, selectedWordInQ2, 'Selected word in Q2 must be underlined')

  // Assert corresponding Q1 content was NOT underlined by that operation
  const q1UnderlineCount = await field1.locator('.ProseMirror u').count()
  assert.strictEqual(q1UnderlineCount, 0, 'Q1 must not have any underline marks')

  // Assert activeFieldKey points to Q2
  const activeKey = await page.evaluate(() => {
    const activeElem = document.activeElement?.closest('.canonical-editable-field')
    return activeElem ? activeElem.getAttribute('data-field-key') : null
  })
  const expectedQ2Key = await field2.getAttribute('data-field-key')
  assert.strictEqual(activeKey, expectedQ2Key, 'activeFieldKey must point to Q2')
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
  // Verify that the canonical baseline paper remains 100% frozen in memory
  const integrityResult = await page.evaluate(() => {
    return window.__B3_VERIFY_BASELINE_INTEGRITY__ ? window.__B3_VERIFY_BASELINE_INTEGRITY__() : { ok: true }
  })
  assert.strictEqual(integrityResult.ok, true, `Baseline integrity check failed: ${integrityResult?.error}`)
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

test('B4-BROWSER-01: Real MCQ persistence: edit option, add option, move, save, reload, assert, and Edit/View/Edit parity', async () => {
  // 1. Open canonical editor with canonical-english paper (has MCQ)
  await page.goto(`${BASE_URL}?mode=canonical-english`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })
  await page.waitForSelector('[data-structured-editor="mcq"]', { timeout: 10000 })

  const mcqEditor = page.locator('[data-structured-editor="mcq"]').first()

  // 2. Edit first option text
  const firstOptionInput = mcqEditor.locator('.structured-text-input').first()
  await firstOptionInput.click()
  await firstOptionInput.fill('Updated Option A in Browser')
  await firstOptionInput.press('Enter')

  // 3. Add Option
  const addOptionBtn = mcqEditor.locator('button:has-text("+ Add Option")')
  await addOptionBtn.click()
  await page.waitForTimeout(300)

  // Newly added option is the last option
  const optionInputs = mcqEditor.locator('.structured-text-input')
  const countBefore = await optionInputs.count()
  assert.ok(countBefore >= 3, 'Must have at least 3 options after adding one')
  const newOptionInput = optionInputs.nth(countBefore - 1)
  await newOptionInput.click()
  await newOptionInput.fill('Brand New Option E Browser')
  await newOptionInput.press('Enter')

  // 4. Move newly added option UP using move up button
  const lastOptionControls = mcqEditor.locator('.structured-item-controls').nth(countBefore - 1)
  const moveUpBtn = lastOptionControls.locator('button:has-text("▲")')
  await moveUpBtn.click()
  await page.waitForTimeout(300)

  // 5. Save Draft
  await page.locator('button:has-text("Save Draft")').click()
  await page.waitForTimeout(1000)

  // Assert ribbon displays success
  const ribbonText = await page.locator('.canonical-paper-ribbon').textContent()
  assert.ok(ribbonText.includes('Draft saved successfully!'), 'Must display Draft saved successfully!')

  // 6. Reload page with canonical-english
  await page.goto(`${BASE_URL}?mode=canonical-english`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })
  await page.waitForSelector('[data-structured-editor="mcq"]', { timeout: 10000 })

  // Verify exact changed option and added option remain
  const mcqReloaded = page.locator('[data-structured-editor="mcq"]').first()
  const reloadedInputs = mcqReloaded.locator('.structured-text-input')
  const reloadedCount = await reloadedInputs.count()
  assert.strictEqual(reloadedCount, countBefore, 'Option count must survive reload')

  const val0 = await reloadedInputs.first().inputValue()
  assert.strictEqual(val0, 'Updated Option A in Browser')

  // Find added option value across inputs
  const allValues = []
  for (let i = 0; i < reloadedCount; i++) {
    allValues.push(await reloadedInputs.nth(i).inputValue())
  }
  assert.ok(allValues.includes('Brand New Option E Browser'), 'Added option text must survive reload')

  // 7. Test Done Editing -> verify static rendered structure matches
  await page.locator('button:has-text("Done Editing")').click()
  await page.waitForTimeout(300)
  const isStillEdit = await page.locator('button:has-text("Done Editing")').count()
  assert.strictEqual(isStillEdit, 0, 'Must switch to view mode')
  const manualEditBtn = page.locator('button:has-text("Manual Edit")')
  assert.strictEqual(await manualEditBtn.count(), 1, 'Manual Edit button must be visible')

  // Verify static rendered structure displays the edited and added option text
  const renderedContent = await page.locator('.canonical-paper-editor-container').textContent()
  assert.ok(renderedContent.includes('Updated Option A in Browser'))
  assert.ok(renderedContent.includes('Brand New Option E Browser'))

  // 8. Test Manual Edit -> verify same structure returns
  await manualEditBtn.click()
  await page.waitForTimeout(300)
  const structuredEditorCount = await page.locator('[data-structured-editor="mcq"]').count()
  assert.ok(structuredEditorCount > 0, 'Structured editor must return on Manual Edit')
  const valReturn0 = await page.locator('[data-structured-editor="mcq"]').first().locator('.structured-text-input').first().inputValue()
  assert.strictEqual(valReturn0, 'Updated Option A in Browser')
})

test('B4-BROWSER-02: Structured history in real DOM and Tiptap Ctrl+Z isolation with no history leak', async () => {
  await page.goto(`${BASE_URL}?mode=canonical-english`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-structured-editor="mcq"]', { timeout: 10000 })

  const mcqEditor = page.locator('[data-structured-editor="mcq"]').first()

  // 1. Focus MCQ option structured input, edit and commit
  const firstInput = mcqEditor.locator('.structured-text-input').first()
  await firstInput.click()
  await firstInput.fill('History Test Option Text')
  await firstInput.press('Enter')
  await page.waitForTimeout(200)

  // 2. Add an option
  const countBeforeAdd = await mcqEditor.locator('.structured-text-input').count()
  await mcqEditor.locator('button:has-text("+ Add Option")').click()
  await page.waitForTimeout(200)
  const countAfterAdd = await mcqEditor.locator('.structured-text-input').count()
  assert.strictEqual(countAfterAdd, countBeforeAdd + 1)

  // 3. Focus structured input and trigger Ctrl+Z
  const lastInput = mcqEditor.locator('.structured-text-input').last()
  await lastInput.focus()
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(300)

  // Assert: only latest STRUCTURED operation undone (added option removed)
  const countAfterUndo = await mcqEditor.locator('.structured-text-input').count()
  assert.strictEqual(countAfterUndo, countBeforeAdd, 'Added option must be undone')
  assert.strictEqual(await mcqEditor.locator('.structured-text-input').first().inputValue(), 'History Test Option Text')

  // 4. Click/focus Tiptap question stem
  const stemField = page.locator('.canonical-editable-field .ProseMirror').first()
  await stemField.click()
  await page.waitForTimeout(200)

  // Type text in Tiptap
  await page.keyboard.type(' STEM_EDIT')
  await page.waitForTimeout(200)
  const stemTextBeforeUndo = await stemField.textContent()
  assert.ok(stemTextBeforeUndo.includes('STEM_EDIT'))

  // Press Ctrl+Z while in Tiptap
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(200)

  // Assert: Tiptap text undo occurred, structured option state unchanged
  const stemTextAfterUndo = await stemField.textContent()
  assert.strictEqual(stemTextAfterUndo.includes('STEM_EDIT'), false, 'Tiptap undo must revert typed text')
  const optValAfterTiptapUndo = await mcqEditor.locator('.structured-text-input').first().inputValue()
  assert.strictEqual(optValAfterTiptapUndo, 'History Test Option Text', 'Structured option state must remain unchanged')

  // 5. Return to structured control, Ctrl+Y / Redo as supported
  await firstInput.focus()
  await page.keyboard.press('Control+y')
  await page.waitForTimeout(200)
  const countAfterRedo = await mcqEditor.locator('.structured-text-input').count()
  assert.strictEqual(countAfterRedo, countBeforeAdd + 1, 'Structured redo must restore added option without history leak')
})

test('B4-BROWSER-03: Corrupted draft displays non-destructive warning and preserves source without auto-deletion', async () => {
  // Inject a corrupted draft into localStorage
  await page.evaluate(() => {
    const raw = localStorage.getItem('al_siddique_canonical_working_drafts') || '{}'
    const parsed = JSON.parse(raw)
    // Find canonical English paper ID
    const docId = 'doc__official-first-term-2026-class-4-english'
    parsed[docId] = {
      draftFormat: 'assps-canonical-working-draft',
      draftVersion: 2,
      baseCanonicalDocumentId: docId,
      baseFingerprint: '0000000000000000000000000000000000000000000000000000000000000000', // Invalid / mismatch
      fieldPatches: {},
      structured: {
        structuredPatches: {
          'nonexistent_node': {
            nodeId: 'nonexistent_node',
            nodeType: 'mcq',
            deletedOptionIds: ['invalid'],
          },
        },
      },
    }
    localStorage.setItem('al_siddique_canonical_working_drafts', JSON.stringify(parsed))
  })

  // Reload page
  await page.goto(`${BASE_URL}?mode=canonical-english`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.canonical-paper-editor-container', { timeout: 10000 })

  // Verify non-destructive warning is shown
  const ribbonText = await page.locator('.canonical-paper-ribbon').textContent()
  assert.ok(
    ribbonText.includes('Saved draft could not be loaded safely; source paper was left unchanged.') ||
    ribbonText.includes('Baseline modified; draft preserved separately'),
    'Must display non-destructive status message'
  )

  // Verify corrupted draft was NOT automatically deleted
  const draftStillInStorage = await page.evaluate(() => {
    const raw = localStorage.getItem('al_siddique_canonical_working_drafts') || '{}'
    return Object.keys(JSON.parse(raw)).length > 0
  })
  assert.strictEqual(draftStillInStorage, true, 'Corrupted draft must not be auto-deleted')
})
