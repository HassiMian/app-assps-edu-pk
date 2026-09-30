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
const PORT = 5194
const BASE_URL = `http://localhost:${PORT}/paper-workspace-test.html`

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

  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } })
  await context.route('**/api/settings/public**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({}),
  }))
  page = await context.newPage()
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message))
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-paper-style-root]', { timeout: 12000 })
})

after(async () => {
  if (browser) await browser.close()
  if (server) await server.close()
})

test('Workspace Urdu: marks and question heading stay on the same visual row', async () => {
  const sectionHeading = page.locator('[data-section-heading]').first()
  const questionHeading = sectionHeading.locator('[data-question-heading]')
  const marks = sectionHeading.locator('[data-marks-badge]')

  await marks.waitFor({ state: 'visible' })
  const headingBox = await questionHeading.boundingBox()
  const marksBox = await marks.boundingBox()
  const sectionBox = await sectionHeading.boundingBox()

  assert.ok(headingBox && marksBox && sectionBox, 'Heading and marks geometry must be measurable')
  const overlap = Math.min(headingBox.y + headingBox.height, marksBox.y + marksBox.height) -
    Math.max(headingBox.y, marksBox.y)
  assert.ok(overlap > 0, 'Question heading and marks badge must vertically overlap on one row')
  assert.ok(sectionBox.height < headingBox.height + marksBox.height + 18, 'Heading grid must not create a second marks row')
})

test('Workspace Urdu: option label uses Urdu letter plus a true closing bracket', async () => {
  const option = page.locator('[data-option-label][data-language="urdu"]').first()
  await option.waitFor({ state: 'visible' })

  const label = option.locator('[data-option-label-text]')
  const bracket = option.locator('[data-option-bracket]')
  assert.equal((await label.textContent()).trim(), 'الف')
  assert.equal((await bracket.textContent()).trim(), ')')
  assert.equal(await bracket.locator('svg').count(), 0, 'Bracket must be a normal text glyph, never an oversized SVG shape')

  const bracketCss = await bracket.evaluate(node => ({
    direction: getComputedStyle(node).direction,
    unicodeBidi: getComputedStyle(node).unicodeBidi,
    fontFamily: getComputedStyle(node).fontFamily,
    fontSize: parseFloat(getComputedStyle(node).fontSize),
    lineHeight: getComputedStyle(node).lineHeight,
  }))
  assert.equal(bracketCss.direction, 'ltr')
  assert.match(bracketCss.unicodeBidi, /isolate|override/i)
  assert.match(bracketCss.fontFamily, /Arial/i)
  const labelFontSize = await label.evaluate(node => parseFloat(getComputedStyle(node).fontSize))
  assert.ok(bracketCss.fontSize <= labelFontSize * 1.05, 'Closing bracket must stay normal-sized beside the Urdu label')

  const optionText = option.locator('..').locator('[data-option-text]')
  const labelBox = await label.boundingBox()
  const bracketBox = await bracket.boundingBox()
  const textBox = await optionText.boundingBox()
  assert.ok(labelBox && bracketBox && textBox)
  assert.ok(labelBox.x > bracketBox.x, 'Urdu label must sit to the right of its closing bracket')
  assert.ok(bracketBox.x > textBox.x, 'Closing bracket must sit between the Urdu label and option text')
})

test('Workspace Urdu: sentence usage renders dedicated word/sentence columns', async () => {
  const table = page.locator('[data-sentence-usage-table]')
  await table.waitFor({ state: 'visible' })
  const text = await table.textContent()
  assert.match(text, /الفاظ/)
  assert.match(text, /جملے/)
  assert.equal(await table.locator('tbody tr').count(), 5)
})

test('Workspace matching columns expose editable Column A/B headings and cells', async () => {
  await page.getByRole('button', { name: 'Edit Paper' }).click()
  const table = page.locator('[data-matching-columns-table]')
  await table.waitFor({ state: 'visible' })

  const headerA = table.locator('[data-column-header="A"]')
  const headerB = table.locator('[data-column-header="B"]')
  assert.match(await headerA.textContent(), /کالم A/)
  assert.match(await headerB.textContent(), /کالم B/)

  const editableHeader = page.getByLabel('Edit Column A heading')
  await editableHeader.fill('کالم الف')
  await editableHeader.blur()

  const editableCell = page.getByLabel('Edit Column A row 1')
  await editableCell.fill('کتابچہ')
  await editableCell.blur()

  await page.getByRole('button', { name: 'Done Editing' }).click()
  assert.match(await table.textContent(), /کالم الف/)
  assert.match(await table.textContent(), /کتابچہ/)
})

test('Workspace objective tools render Bubble Sheet and teacher-set Answer Key', async () => {
  const bubbleToggle = page.getByLabel('Bubble Sheet')
  const answerToggle = page.getByLabel('Answer Keys')
  if (!(await bubbleToggle.isChecked())) await bubbleToggle.check()
  if (!(await answerToggle.isChecked())) await answerToggle.check()

  const bubble = page.locator('[data-workspace-bubble-sheet]')
  const answerKey = page.locator('[data-workspace-answer-key]')
  await bubble.waitFor({ state: 'visible' })
  await answerKey.waitFor({ state: 'visible' })
  assert.equal(await bubble.locator('[data-bubble-row]').count(), 1)
  assert.equal(await answerKey.locator('[data-answer-key-row]').count(), 1)
  assert.match(await answerKey.locator('[data-answer-key-row]').first().textContent(), /—/)

  await page.getByRole('button', { name: 'Edit Paper' }).click()
  const mcqSection = page.locator('[data-official-section][data-section-kind="mcq"]').first()
  await mcqSection.evaluate(el => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
  await page.locator('[data-answer-key-editor]').waitFor({ state: 'visible' })
  await page.getByLabel('Set MCQ 1 answer الف').click()

  assert.equal(await bubble.locator('[data-bubble-option][data-selected="true"]').count(), 1)
  assert.match(await answerKey.locator('[data-answer-key-row]').first().textContent(), /الف/)
  await page.getByRole('button', { name: 'Done Editing' }).click()
})

test('Workspace structure controls visibly switch MCQ, short, borders, watermark and Urdu section UI', async () => {
  const panel = page.locator('details').filter({ hasText: 'Paper Style & Layout' })
  if (!(await panel.evaluate(el => el.open))) await panel.locator('summary').click()

  await page.getByLabel('MCQ layout Grid').click()
  await page.locator('[data-official-mcq-grid]').waitFor({ state: 'visible' })
  await page.getByLabel('MCQ layout Classic').click()
  await page.locator('[data-official-mcq-classic]').waitFor({ state: 'visible' })
  await page.getByLabel('MCQ layout Table').click()
  await page.locator('[data-official-mcq-table]').waitFor({ state: 'visible' })

  await page.getByLabel('Short questions layout 2 Columns').click()
  await page.locator('[data-short-two-column]').waitFor({ state: 'visible' })
  await page.getByLabel('Short questions layout Table 1-Col').click()
  await page.locator('[data-short-table][data-short-table-columns="1"]').waitFor({ state: 'visible' })
  await page.getByLabel('Short questions layout Table 2-Col').click()
  await page.locator('[data-short-table][data-short-table-columns="2"]').waitFor({ state: 'visible' })
  await page.getByLabel('Short questions layout 1 Column').click()
  const shortSection = page.locator('[data-official-section][data-section-kind="short"]')
  await shortSection.locator('[data-numbered-list]').waitFor({ state: 'visible' })

  const firstSection = page.locator('[data-official-section]').first()
  await page.getByLabel('Question border Box').click()
  assert.equal(await firstSection.getAttribute('data-question-border'), 'box')
  assert.notEqual(await firstSection.evaluate(el => getComputedStyle(el).borderStyle), 'none')
  await page.getByLabel('Question border Table').click()
  assert.equal(await firstSection.getAttribute('data-question-border'), 'table')
  assert.notEqual(await firstSection.locator('[data-section-heading]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)')
  await page.getByLabel('Question border None').click()

  await page.getByLabel('Page border Premium').click()
  const root = page.locator('[data-paper-style-root]')
  const frame = await root.evaluate(el => ({ border: el.style.border, shadow: el.style.boxShadow }))
  assert.match(frame.border, /solid/)
  assert.match(frame.shadow, /inset/)

  const wmToggle = page.getByLabel('Logo WM')
  if (!(await wmToggle.isChecked())) await wmToggle.check()
  const wmSize = page.getByLabel('Watermark Size')
  await wmSize.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter.call(el, '1.75')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const preview = page.locator('.preview-container')
  assert.equal(await preview.getAttribute('data-watermark-enabled'), 'true')
  assert.equal(await preview.getAttribute('data-watermark-scale'), '1.75')

  const urduHeaders = page.getByLabel('حصہ معروضی / انشائیہ')
  if (!(await urduHeaders.isChecked())) await urduHeaders.check()
  const banners = await page.locator('[data-section-banner]').allTextContents()
  assert.ok(banners.some(text => text.includes('حصہ معروضی')))
  assert.ok(banners.some(text => text.includes('حصہ انشائیہ')))

  const sectionLines = page.getByLabel('Section Lines')
  if (await sectionLines.isChecked()) await sectionLines.uncheck()
  assert.equal(await page.locator('[data-section-heading]').first().evaluate(el => getComputedStyle(el).borderBottomStyle), 'none')
  await sectionLines.check()
})

test('Workspace Edit Paper preserves selection-only bold, italic, underline, font and size formatting', async () => {
  await page.getByRole('button', { name: 'Edit Paper' }).click()
  const editable = page.getByLabel('Edit MCQ 1 question')
  await editable.click()
  const expectedSelection = await editable.evaluate(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const node = walker.nextNode()
    if (!node) throw new Error('No editable text node')
    const range = document.createRange()
    range.setStart(node, 0)
    range.setEnd(node, Math.min(5, node.textContent.length))
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
    // Simulate Chromium firing multiple selectionchange events while a mouse
    // drag is still in progress. The paper must not re-render and collapse it.
    for (let i = 0; i < 8; i += 1) {
      document.dispatchEvent(new Event('selectionchange', { bubbles: true }))
    }
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    return selection.toString()
  })

  await page.waitForTimeout(180)
  const liveSelection = await editable.evaluate(el => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return ''
    const range = selection.getRangeAt(0)
    return el.contains(range.commonAncestorContainer) ? selection.toString() : ''
  })
  assert.equal(liveSelection, expectedSelection, 'Highlighted text must remain visibly selected instead of blinking/collapsing')

  const toolbar = page.locator('[data-inline-selection-toolbar]')
  assert.equal(await toolbar.getAttribute('data-selection-saved'), 'true')
  await toolbar.getByRole('button', { name: 'B', exact: true }).click()
  await toolbar.getByRole('button', { name: 'I', exact: true }).click()
  await toolbar.getByRole('button', { name: 'U', exact: true }).click()
  await toolbar.getByLabel('Selected text font').selectOption('Georgia')
  await toolbar.getByLabel('Selected text size').selectOption('18')

  const htmlDuringEdit = await editable.innerHTML()
  assert.match(htmlDuringEdit, /font-weight:\s*bold/i)
  assert.match(htmlDuringEdit, /font-style:\s*italic/i)
  assert.match(htmlDuringEdit, /text-decoration(?:-line)?:\s*underline/i)
  assert.match(htmlDuringEdit, /font-family:\s*Georgia/i)
  assert.match(htmlDuringEdit, /font-size:\s*18pt/i)

  await page.getByRole('button', { name: 'Done Editing' }).click()
  const persisted = page.locator('[data-edit-field="mcq-0-prompt"]').first()
  const persistedHtml = await persisted.innerHTML()
  assert.match(persistedHtml, /font-weight:\s*bold/i)
  assert.match(persistedHtml, /font-style:\s*italic/i)
  assert.match(persistedHtml, /text-decoration(?:-line)?:\s*underline/i)
  assert.match(persistedHtml, /font-family:\s*Georgia/i)
  assert.match(persistedHtml, /font-size:\s*18pt/i)
})

test('Workspace style controls mutate the actual paper style root and Urdu content', async () => {
  const stylePanel = page.locator('details').filter({ hasText: 'Paper Style & Layout' })
  if (!(await stylePanel.evaluate(el => el.open))) await stylePanel.locator('summary').click()

  const root = page.locator('[data-paper-style-root]')
  const urduSections = page.locator('[data-official-sections]')

  const setRange = async (label, value) => {
    await page.getByLabel(label).evaluate((el, next) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter.call(el, String(next))
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
  }

  await setRange('Paper Letter Spacing', 1.5)
  await setRange('Paper Word Spacing', 4)
  await setRange('Urdu Line Height', 2.8)

  await page.getByLabel('Paper Font Family').selectOption("'Times New Roman', serif")
  await page.getByLabel('Paper Body Font Size').fill('14')
  await page.getByLabel('Paper Heading Font Size').fill('16')
  await page.getByTitle('Bold whole paper').click()
  await page.getByTitle('Italic whole paper').click()
  await page.getByTitle('Underline whole paper').click()
  await page.getByTitle('Center align').click()

  const state = await root.evaluate(node => ({
    letterSpacing: node.style.letterSpacing,
    wordSpacing: node.style.wordSpacing,
    lineHeight: node.style.lineHeight,
    fontFamily: node.style.fontFamily,
    fontSize: node.style.fontSize,
    fontWeight: node.style.fontWeight,
    fontStyle: node.style.fontStyle,
    textDecoration: node.style.textDecoration,
    textAlign: node.style.textAlign,
    dataFont: node.getAttribute('data-paper-font-family'),
  }))
  assert.equal(state.letterSpacing, '1.5px')
  assert.equal(state.wordSpacing, '4px')
  assert.equal(state.lineHeight, '2.8')
  assert.match(state.fontFamily, /Times New Roman/i)
  assert.ok(parseFloat(state.fontSize) >= 20, 'Urdu body-size control must materially change the rendered paper size')
  assert.equal(state.fontWeight, '700')
  assert.equal(state.fontStyle, 'italic')
  assert.match(state.textDecoration, /underline/)
  assert.equal(state.textAlign, 'center')
  assert.match(state.dataFont, /Times New Roman/i)

  const headingSize = await page.locator('[data-question-heading]').first().evaluate(node => parseFloat(node.style.fontSize))
  assert.ok(headingSize >= 25, 'Heading-size control must reach the question heading renderer')

  const sectionFont = await urduSections.evaluate(node => getComputedStyle(node).fontFamily)
  const sectionSpacing = await urduSections.evaluate(node => ({
    lineHeight: node.style.lineHeight,
    letterSpacing: node.style.letterSpacing,
    wordSpacing: node.style.wordSpacing,
  }))
  assert.match(sectionFont, /Times New Roman/i, 'Explicit font selection must reach the Urdu section renderer')
  assert.equal(sectionSpacing.lineHeight, '2.8')
  assert.equal(sectionSpacing.letterSpacing, '1.5px')
  assert.equal(sectionSpacing.wordSpacing, '4px')

  const actualQuestionText = page.locator('[data-option-text]').first()
  const actualStyle = await actualQuestionText.evaluate(node => {
    const css = getComputedStyle(node)
    return {
      fontFamily: css.fontFamily,
      fontWeight: Number(css.fontWeight) || 0,
      fontStyle: css.fontStyle,
      textDecorationLine: css.textDecorationLine,
      letterSpacing: css.letterSpacing,
      wordSpacing: css.wordSpacing,
    }
  })
  assert.match(actualStyle.fontFamily, /Times New Roman/i, 'Font control must reach actual question content')
  assert.ok(actualStyle.fontWeight >= 700, 'Bold control must reach actual question content')
  assert.equal(actualStyle.fontStyle, 'italic', 'Italic control must reach actual question content')
  assert.match(actualStyle.textDecorationLine, /underline/, 'Underline control must reach actual question content')
  assert.equal(actualStyle.letterSpacing, '1.5px')
  assert.equal(actualStyle.wordSpacing, '4px')
})

test('Workspace print uses the styled preview clone and preserves the isolated Urdu bracket', async () => {
  await page.getByRole('button', { name: 'Print' }).click()
  const iframe = page.locator('#__print_frame')
  await iframe.waitFor({ state: 'attached', timeout: 8000 })

  const printed = await iframe.evaluate(frame => {
    const doc = frame.contentDocument
    const root = doc.querySelector('[data-paper-style-root]')
    const bracket = doc.querySelector('[data-option-bracket]')
    return {
      fontFamily: root?.style.fontFamily || '',
      letterSpacing: root?.style.letterSpacing || '',
      wordSpacing: root?.style.wordSpacing || '',
      lineHeight: root?.style.lineHeight || '',
      bracketText: bracket?.textContent?.trim() || '',
      bracketFont: bracket ? getComputedStyle(bracket).fontFamily : '',
      bracketDirection: bracket ? getComputedStyle(bracket).direction : '',
      bubbleCount: doc.querySelectorAll('[data-workspace-bubble-sheet]').length,
      answerKeyCount: doc.querySelectorAll('[data-workspace-answer-key]').length,
    }
  })

  assert.match(printed.fontFamily, /Times New Roman/i)
  assert.equal(printed.letterSpacing, '1.5px')
  assert.equal(printed.wordSpacing, '4px')
  assert.equal(printed.lineHeight, '2.8')
  assert.equal(printed.bracketText, ')')
  assert.match(printed.bracketFont, /Arial/i)
  assert.equal(printed.bracketDirection, 'ltr')
  assert.equal(printed.bubbleCount, 1)
  assert.equal(printed.answerKeyCount, 1)
})
