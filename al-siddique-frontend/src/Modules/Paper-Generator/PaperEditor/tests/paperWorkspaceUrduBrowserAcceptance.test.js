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
  const bracketShape = bracket.locator('[data-option-bracket-shape]')
  assert.equal((await label.textContent()).trim(), 'الف')
  assert.equal((await bracket.textContent()).trim(), ')')
  await bracketShape.waitFor({ state: 'visible' })
  assert.match(await bracketShape.locator('path').getAttribute('d'), /M1\.1 1\.2 C5\.1 4\.1 6\.8 7\.2 6\.8 9/)

  const bracketCss = await bracket.evaluate(node => ({
    direction: getComputedStyle(node).direction,
    unicodeBidi: getComputedStyle(node).unicodeBidi,
    fontFamily: getComputedStyle(node).fontFamily,
  }))
  assert.equal(bracketCss.direction, 'ltr')
  assert.match(bracketCss.unicodeBidi, /isolate|override/i)
  assert.match(bracketCss.fontFamily, /Arial/i)

  const labelBox = await label.boundingBox()
  const bracketBox = await bracket.boundingBox()
  assert.ok(labelBox && bracketBox)
  assert.ok(labelBox.x > bracketBox.x, 'In RTL visual order the Urdu label must sit to the right of its closing bracket')
})

test('Workspace Urdu: sentence usage renders dedicated word/sentence columns', async () => {
  const table = page.locator('[data-sentence-usage-table]')
  await table.waitFor({ state: 'visible' })
  const text = await table.textContent()
  assert.match(text, /لفظ/)
  assert.match(text, /جملہ/)
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

test('Workspace style controls mutate the actual paper style root and Urdu content', async () => {
  await page.locator('summary').filter({ hasText: 'Paper Style & Layout' }).click()

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
    }
  })

  assert.match(printed.fontFamily, /Times New Roman/i)
  assert.equal(printed.letterSpacing, '1.5px')
  assert.equal(printed.wordSpacing, '4px')
  assert.equal(printed.lineHeight, '2.8')
  assert.equal(printed.bracketText, ')')
  assert.match(printed.bracketFont, /Arial/i)
  assert.equal(printed.bracketDirection, 'ltr')
})
